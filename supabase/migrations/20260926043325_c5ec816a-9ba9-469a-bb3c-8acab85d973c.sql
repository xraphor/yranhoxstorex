CREATE OR REPLACE FUNCTION public.approve_order(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE it record; stock_id uuid; stock_content text; i integer;
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

      UPDATE public.product_stock_items
        SET delivered = true, order_id = p_order_id, delivered_at = now()
      WHERE id = stock_id;

      UPDATE public.order_items
        SET delivered_content = concat_ws(E'\n', delivered_content, stock_content)
      WHERE id = it.id;
    END LOOP;
  END LOOP;

  UPDATE public.orders SET status = 'paid', paid_at = now() WHERE id = p_order_id;
END; $function$;

REVOKE EXECUTE ON FUNCTION public.approve_order(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.approve_order(uuid) TO authenticated, service_role;