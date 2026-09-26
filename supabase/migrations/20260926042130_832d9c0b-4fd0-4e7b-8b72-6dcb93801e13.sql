-- helpers
CREATE OR REPLACE FUNCTION public.is_store_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(lower(auth.jwt() ->> 'email') = 'raphael900001@gmail.com', false);
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  display_name text,
  role text NOT NULL DEFAULT 'buyer',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_store_admin());
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE OR REPLACE FUNCTION public.enforce_profile_role()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF lower(NEW.email) = 'raphael900001@gmail.com' THEN NEW.role := 'admin';
  ELSE NEW.role := 'buyer'; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_profiles_role BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_role();
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- products
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'Contas',
  price_cents integer NOT NULL DEFAULT 0,
  original_price_cents integer,
  image_url text,
  images text[] NOT NULL DEFAULT '{}',
  tags text[] NOT NULL DEFAULT '{}',
  warranty text,
  active boolean NOT NULL DEFAULT true,
  featured boolean NOT NULL DEFAULT false,
  stock_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_public_read" ON public.products FOR SELECT TO anon, authenticated
  USING (active = true OR public.is_store_admin());
CREATE POLICY "products_admin_write" ON public.products FOR ALL TO authenticated
  USING (public.is_store_admin()) WITH CHECK (public.is_store_admin());
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- stock items
CREATE TABLE public.product_stock_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  content text NOT NULL,
  delivered boolean NOT NULL DEFAULT false,
  order_id uuid,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_stock_items TO authenticated;
GRANT ALL ON public.product_stock_items TO service_role;
ALTER TABLE public.product_stock_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stock_admin_all" ON public.product_stock_items FOR ALL TO authenticated
  USING (public.is_store_admin()) WITH CHECK (public.is_store_admin());
CREATE TRIGGER trg_stock_updated BEFORE UPDATE ON public.product_stock_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.sync_stock_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pid uuid;
BEGIN
  pid := coalesce(NEW.product_id, OLD.product_id);
  UPDATE public.products p SET stock_count = (
    SELECT count(*) FROM public.product_stock_items s
    WHERE s.product_id = pid AND s.delivered = false
  ) WHERE p.id = pid;
  RETURN NULL;
END; $$;
CREATE TRIGGER trg_stock_sync AFTER INSERT OR UPDATE OR DELETE ON public.product_stock_items
  FOR EACH ROW EXECUTE FUNCTION public.sync_stock_count();

-- orders
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  buyer_email text NOT NULL,
  total_cents integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  pix_payload text,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '15 minutes',
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders_select_own" ON public.orders FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_store_admin());
CREATE POLICY "orders_insert_own" ON public.orders FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "orders_update_own_pending" ON public.orders FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND status IN ('pending','awaiting_confirmation'))
  WITH CHECK (user_id = auth.uid() AND status IN ('pending','awaiting_confirmation','cancelled'));
CREATE POLICY "orders_admin_all" ON public.orders FOR ALL TO authenticated
  USING (public.is_store_admin()) WITH CHECK (public.is_store_admin());
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- order items
CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_title text NOT NULL,
  unit_price_cents integer NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 1,
  delivered_content text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order_items_select_own" ON public.order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid())
         OR public.is_store_admin());
CREATE POLICY "order_items_insert_own" ON public.order_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));
CREATE POLICY "order_items_admin_all" ON public.order_items FOR ALL TO authenticated
  USING (public.is_store_admin()) WITH CHECK (public.is_store_admin());
CREATE TRIGGER trg_order_items_updated BEFORE UPDATE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- store settings
CREATE TABLE public.store_settings (
  id integer PRIMARY KEY DEFAULT 1,
  banner_title text NOT NULL DEFAULT 'yRanhox Store X',
  banner_subtitle text NOT NULL DEFAULT 'Contas, keys e scripts com entrega automática via Pix',
  top_notice text DEFAULT 'Entrega automática 24/7 · Pagamento via Pix',
  pix_key text,
  pix_payload text,
  support_link text,
  social_links jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT store_settings_single_row CHECK (id = 1)
);
GRANT SELECT ON public.store_settings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.store_settings TO authenticated;
GRANT ALL ON public.store_settings TO service_role;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_public_read" ON public.store_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "settings_admin_write" ON public.store_settings FOR ALL TO authenticated
  USING (public.is_store_admin()) WITH CHECK (public.is_store_admin());
CREATE TRIGGER trg_settings_updated BEFORE UPDATE ON public.store_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.store_settings (id, pix_payload, pix_key)
VALUES (1, '00020126580014BR.GOV.BCB.PIX01362f7d7f8e-512a-44a3-8d64-a1366a6e4c055204000053039865802BR5921Raphael Ribeiro Gomes6009SAO PAULO62140510BTY9UZcOVt6304BCA4', '2f7d7f8e-512a-44a3-8d64-a1366a6e4c05');

-- automatic delivery on approval (admin only)
CREATE OR REPLACE FUNCTION public.approve_order(p_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE it record; stock_id uuid; stock_content text; i integer;
BEGIN
  IF NOT public.is_store_admin() THEN RAISE EXCEPTION 'not authorized'; END IF;
  IF (SELECT status FROM public.orders WHERE id = p_order_id) = 'paid' THEN RETURN; END IF;

  FOR it IN SELECT * FROM public.order_items WHERE order_id = p_order_id LOOP
    FOR i IN 1..greatest(it.quantity, 1) LOOP
      SELECT id, content INTO stock_id, stock_content
      FROM public.product_stock_items
      WHERE product_id = it.product_id AND delivered = false
      ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED;

      IF stock_id IS NULL THEN RAISE EXCEPTION 'sem estoque disponivel para %', it.product_title; END IF;

      UPDATE public.product_stock_items
        SET delivered = true, order_id = p_order_id, delivered_at = now()
      WHERE id = stock_id;

      UPDATE public.order_items
        SET delivered_content = concat_ws(E'\n', delivered_content, stock_content)
      WHERE id = it.id;
    END LOOP;
  END LOOP;

  UPDATE public.orders SET status = 'paid', paid_at = now() WHERE id = p_order_id;
END; $$;
REVOKE ALL ON FUNCTION public.approve_order(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.approve_order(uuid) TO authenticated, service_role;