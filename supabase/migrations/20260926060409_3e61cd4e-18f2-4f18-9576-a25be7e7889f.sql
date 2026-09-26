CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY categories_public_read ON public.categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY categories_admin_write ON public.categories FOR ALL TO authenticated USING (public.is_store_admin()) WITH CHECK (public.is_store_admin());
INSERT INTO public.categories (name, sort_order) VALUES ('Jogos',1),('Contas',2),('Keys',3),('Scripts',4),('Métodos',5);

CREATE TABLE public.product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  user_id uuid DEFAULT auth.uid(),
  author_name text NOT NULL,
  message text NOT NULL,
  rating integer NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  is_official boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.product_reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_reviews TO authenticated;
GRANT ALL ON public.product_reviews TO service_role;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY reviews_public_read ON public.product_reviews FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY reviews_buyer_insert ON public.product_reviews FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND is_official = false AND EXISTS (
    SELECT 1 FROM public.orders o JOIN public.order_items oi ON oi.order_id = o.id
    WHERE o.user_id = auth.uid() AND o.status = 'paid' AND oi.product_id = product_reviews.product_id));
CREATE POLICY reviews_admin_all ON public.product_reviews FOR ALL TO authenticated USING (public.is_store_admin()) WITH CHECK (public.is_store_admin());