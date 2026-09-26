CREATE OR REPLACE FUNCTION public.approve_order(p_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE it record; stock_id uuid; stock_content text; i integer;
BEGIN
  IF NOT (public.is_store_admin() OR current_user = 'service_role') THEN
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
END; $$;
REVOKE ALL ON FUNCTION public.approve_order(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.approve_order(uuid) TO authenticated, service_role;

WITH seeded AS (
  INSERT INTO public.products (title, description, category, price_cents, original_price_cents, image_url, tags, warranty, featured)
  VALUES
    ('Conta Steam Full Acesso', E'Conta Steam com biblioteca de jogos AAA.\n\n- Acesso completo (login + e-mail)\n- Troca de dados liberada\n- Entrega imediata após o Pix', 'Contas', 4990, 8990, 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80', ARRAY['steam','full acesso','aaa'], 'Garantia de 7 dias para troca em caso de problema no acesso.', true),
    ('Key de Ativação Windows 11 Pro', E'Chave original de ativação vitalícia do Windows 11 Pro.\n\n- 1 dispositivo\n- Ativação online\n- Suporte na instalação', 'Keys', 2990, 5990, 'https://images.unsplash.com/photo-1587831990711-23ca6441447b?auto=format&fit=crop&w=1200&q=80', ARRAY['windows','licença','vitalícia'], 'Garantia vitalícia de ativação.', true),
    ('Script Premium para FiveM', E'Pacote de scripts otimizados para servidores FiveM.\n\n- Código não ofuscado\n- Atualizações inclusas\n- Documentação em português', 'Scripts', 7990, 11990, 'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?auto=format&fit=crop&w=1200&q=80', ARRAY['fivem','lua','servidor'], 'Suporte técnico por 30 dias.', false),
    ('Pacote de Itens Raros', E'Itens raros entregues diretamente na sua conta do jogo.\n\n- Entrega automática do código de resgate\n- Itens permanentes', 'Jogos', 1990, 3490, 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80', ARRAY['itens','skins','raros'], 'Reposição imediata se o código falhar.', false)
  RETURNING id, category
)
INSERT INTO public.product_stock_items (product_id, content)
SELECT s.id, v.content
FROM seeded s
CROSS JOIN LATERAL (
  VALUES
    (concat('DEMO-', upper(substr(replace(s.id::text,'-',''),1,6)), '-A1B2-C3D4')),
    (concat('DEMO-', upper(substr(replace(s.id::text,'-',''),1,6)), '-E5F6-G7H8')),
    (concat('DEMO-', upper(substr(replace(s.id::text,'-',''),1,6)), '-I9J0-K1L2'))
) AS v(content);