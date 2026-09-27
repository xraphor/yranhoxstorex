
-- Seller profiles
CREATE TABLE public.seller_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  pix_key text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.seller_profiles TO authenticated;
GRANT ALL ON public.seller_profiles TO service_role;
ALTER TABLE public.seller_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY seller_select ON public.seller_profiles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_store_admin());
CREATE POLICY seller_insert ON public.seller_profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND status = 'active');
CREATE POLICY seller_update ON public.seller_profiles FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_store_admin()) WITH CHECK (user_id = auth.uid() OR public.is_store_admin());
CREATE TRIGGER trg_seller_updated BEFORE UPDATE ON public.seller_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.enforce_seller_status() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NOT public.is_store_admin() THEN NEW.status := OLD.status; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_seller_status BEFORE UPDATE ON public.seller_profiles FOR EACH ROW EXECUTE FUNCTION public.enforce_seller_status();

-- Products ownership
ALTER TABLE public.products ADD COLUMN seller_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.products ADD COLUMN seller_name text;

CREATE OR REPLACE FUNCTION public.enforce_product_owner() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NOT public.is_store_admin() THEN
    IF TG_OP = 'INSERT' THEN
      NEW.seller_id := auth.uid();
      NEW.featured := false;
    ELSE
      NEW.seller_id := OLD.seller_id;
      NEW.featured := OLD.featured;
    END IF;
  END IF;
  IF NEW.seller_id IS NOT NULL THEN
    NEW.seller_name := (SELECT display_name FROM public.seller_profiles WHERE user_id = NEW.seller_id);
  ELSE
    NEW.seller_name := NULL;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_products_owner BEFORE INSERT OR UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.enforce_product_owner();

CREATE POLICY products_seller_select ON public.products FOR SELECT TO authenticated USING (seller_id = auth.uid());
CREATE POLICY products_seller_insert ON public.products FOR INSERT TO authenticated WITH CHECK (
  seller_id = auth.uid() AND featured = false
  AND EXISTS (SELECT 1 FROM public.seller_profiles s WHERE s.user_id = auth.uid() AND s.status = 'active'));
CREATE POLICY products_seller_update ON public.products FOR UPDATE TO authenticated USING (seller_id = auth.uid()) WITH CHECK (seller_id = auth.uid());
CREATE POLICY products_seller_delete ON public.products FOR DELETE TO authenticated USING (seller_id = auth.uid());

CREATE POLICY stock_seller_all ON public.product_stock_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.seller_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.seller_id = auth.uid()));

-- Wallet
CREATE TABLE public.wallet_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type text NOT NULL CHECK (owner_type IN ('seller','store')),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  withdrawal_id uuid,
  kind text NOT NULL CHECK (kind IN ('sale_credit','fee_credit','refund_debit','withdrawal','withdrawal_reversal')),
  amount_cents integer NOT NULL,
  description text NOT NULL DEFAULT '',
  release_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wallet_entries TO authenticated;
GRANT ALL ON public.wallet_entries TO service_role;
ALTER TABLE public.wallet_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY wallet_select ON public.wallet_entries FOR SELECT TO authenticated
  USING ((owner_type = 'seller' AND user_id = auth.uid()) OR public.is_store_admin());

CREATE TABLE public.withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type text NOT NULL CHECK (owner_type IN ('seller','store')),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  seller_name text,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  pix_key text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','rejected')),
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.withdrawals TO authenticated;
GRANT ALL ON public.withdrawals TO service_role;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY withdrawals_select ON public.withdrawals FOR SELECT TO authenticated
  USING ((owner_type = 'seller' AND user_id = auth.uid()) OR public.is_store_admin());

-- Push subscriptions
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY push_own ON public.push_subscriptions FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Balance
CREATE OR REPLACE FUNCTION public.wallet_balance(p_owner text DEFAULT 'seller')
RETURNS TABLE(pending_cents bigint, available_cents bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    coalesce(sum(amount_cents) FILTER (WHERE release_at > now() AND amount_cents > 0), 0),
    coalesce(sum(amount_cents) FILTER (WHERE release_at <= now() OR amount_cents < 0), 0)
  FROM public.wallet_entries
  WHERE (p_owner = 'store' AND public.is_store_admin() AND owner_type = 'store')
     OR (p_owner = 'seller' AND owner_type = 'seller' AND user_id = auth.uid());
$$;
REVOKE EXECUTE ON FUNCTION public.wallet_balance(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.wallet_balance(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.request_withdrawal(p_amount_cents integer, p_pix_key text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE avail bigint; wid uuid; is_store boolean := public.is_store_admin(); sname text; otype text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authorized'; END IF;
  IF p_amount_cents IS NULL OR p_amount_cents <= 0 THEN RAISE EXCEPTION 'valor invalido'; END IF;
  IF length(coalesce(trim(p_pix_key),'')) < 3 THEN RAISE EXCEPTION 'chave pix invalida'; END IF;
  otype := CASE WHEN is_store THEN 'store' ELSE 'seller' END;
  IF NOT is_store AND NOT EXISTS (SELECT 1 FROM seller_profiles WHERE user_id = auth.uid() AND status='active') THEN
    RAISE EXCEPTION 'vendedor inativo';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext(coalesce(auth.uid()::text,'store')));
  SELECT available_cents INTO avail FROM public.wallet_balance(otype);
  IF avail < p_amount_cents THEN RAISE EXCEPTION 'saldo insuficiente'; END IF;
  SELECT display_name INTO sname FROM seller_profiles WHERE user_id = auth.uid();
  INSERT INTO withdrawals(owner_type, user_id, seller_name, amount_cents, pix_key, status, processed_at)
  VALUES (otype, auth.uid(), CASE WHEN is_store THEN 'Loja' ELSE sname END, p_amount_cents, trim(p_pix_key),
          CASE WHEN is_store THEN 'paid' ELSE 'pending' END, CASE WHEN is_store THEN now() END)
  RETURNING id INTO wid;
  INSERT INTO wallet_entries(owner_type, user_id, withdrawal_id, kind, amount_cents, description)
  VALUES (otype, CASE WHEN is_store THEN NULL ELSE auth.uid() END, wid, 'withdrawal', -p_amount_cents, 'Saque via Pix');
  RETURN wid;
END; $$;
REVOKE EXECUTE ON FUNCTION public.request_withdrawal(integer, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.request_withdrawal(integer, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.process_withdrawal(p_id uuid, p_paid boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w record;
BEGIN
  IF NOT public.is_store_admin() THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT * INTO w FROM withdrawals WHERE id = p_id FOR UPDATE;
  IF w IS NULL OR w.status <> 'pending' THEN RAISE EXCEPTION 'saque ja processado'; END IF;
  UPDATE withdrawals SET status = CASE WHEN p_paid THEN 'paid' ELSE 'rejected' END, processed_at = now() WHERE id = p_id;
  IF NOT p_paid THEN
    INSERT INTO wallet_entries(owner_type, user_id, withdrawal_id, kind, amount_cents, description)
    VALUES (w.owner_type, w.user_id, w.id, 'withdrawal_reversal', w.amount_cents, 'Saque recusado (valor devolvido)');
  END IF;
END; $$;
REVOKE EXECUTE ON FUNCTION public.process_withdrawal(uuid, boolean) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.process_withdrawal(uuid, boolean) TO authenticated;

-- Approve order with 80/20 split
CREATE OR REPLACE FUNCTION public.approve_order(p_order_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE it record; stock_id uuid; stock_content text; i integer; gross integer; fee integer; sid uuid;
BEGIN
  IF NOT (
    public.is_store_admin()
    OR session_user = 'service_role'
    OR coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role'
    OR coalesce(auth.jwt() ->> 'role', '') = 'service_role'
  ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF (SELECT status FROM public.orders WHERE id = p_order_id) = 'paid' THEN RETURN; END IF;

  FOR it IN SELECT * FROM public.order_items WHERE order_id = p_order_id LOOP
    FOR i IN 1..greatest(it.quantity, 1) LOOP
      SELECT id, content INTO stock_id, stock_content
      FROM public.product_stock_items
      WHERE product_id = it.product_id AND delivered = false
      ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED;
      IF stock_id IS NULL THEN RAISE EXCEPTION 'sem estoque disponivel para %', it.product_title; END IF;
      UPDATE public.product_stock_items SET delivered = true, order_id = p_order_id, delivered_at = now() WHERE id = stock_id;
      UPDATE public.order_items SET delivered_content = concat_ws(E'\n', delivered_content, stock_content) WHERE id = it.id;
    END LOOP;

    gross := it.unit_price_cents * greatest(it.quantity, 1);
    SELECT seller_id INTO sid FROM public.products WHERE id = it.product_id;
    IF sid IS NOT NULL THEN
      fee := floor(gross * 0.20);
      INSERT INTO public.wallet_entries(owner_type, user_id, order_id, kind, amount_cents, description, release_at)
      VALUES ('seller', sid, p_order_id, 'sale_credit', gross - fee, it.product_title, now() + interval '3 days');
      INSERT INTO public.wallet_entries(owner_type, user_id, order_id, kind, amount_cents, description)
      VALUES ('store', NULL, p_order_id, 'fee_credit', fee, 'Taxa 20% · ' || it.product_title);
    ELSE
      INSERT INTO public.wallet_entries(owner_type, user_id, order_id, kind, amount_cents, description)
      VALUES ('store', NULL, p_order_id, 'sale_credit', gross, it.product_title);
    END IF;
  END LOOP;

  UPDATE public.orders SET status = 'paid', paid_at = now() WHERE id = p_order_id;
END; $function$;

-- Reverse wallet when a paid order is cancelled/refunded
CREATE OR REPLACE FUNCTION public.reverse_order_wallet() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.status = 'paid' AND NEW.status IN ('cancelled','refunded') THEN
    INSERT INTO wallet_entries(owner_type, user_id, order_id, kind, amount_cents, description)
    SELECT owner_type, user_id, order_id, 'refund_debit', -amount_cents, 'Reembolso · ' || description
    FROM wallet_entries WHERE order_id = NEW.id AND kind IN ('sale_credit','fee_credit');
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.reverse_order_wallet() FROM anon, authenticated, public;
CREATE TRIGGER trg_orders_wallet_reverse AFTER UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.reverse_order_wallet();

ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
