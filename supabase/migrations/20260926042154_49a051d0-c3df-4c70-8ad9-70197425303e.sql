CREATE OR REPLACE FUNCTION public.sync_stock_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE pid uuid;
BEGIN
  pid := coalesce(NEW.product_id, OLD.product_id);
  UPDATE public.products p SET stock_count = (
    SELECT count(*) FROM public.product_stock_items s
    WHERE s.product_id = pid AND s.delivered = false
  ) WHERE p.id = pid;
  RETURN NULL;
END; $$;
REVOKE ALL ON FUNCTION public.sync_stock_count() FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.sync_stock_count() TO service_role;
REVOKE ALL ON FUNCTION public.is_store_admin() FROM anon, public;
REVOKE ALL ON FUNCTION public.approve_order(uuid) FROM anon;