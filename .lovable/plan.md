# Marketplace com vendedores, carteira e aviso no celular

## Sobre o Nubank
Não dá para confirmar uma vez no Nubank e fazer os próximos pagamentos entrarem sozinhos: o Nubank não avisa sites quando um Pix chega. Então o fluxo fica assim:
1. O cliente paga no seu Pix, com o valor exato.
2. **Seu celular apita** com "Novo Pix para aprovar: R$ X, pedido #123".
3. Você toca no aviso e abre direto a tela de aprovação. Lá aparece um botão **"Abrir Nubank"** para você conferir o Pix.
4. Você volta e toca em **Aprovar**. Na hora, o produto é entregue e a divisão 80/20 é lançada nas carteiras.

## O que será criado

**Vendedores**
- Qualquer pessoa com conta pode ativar "Quero vender" e publicar anúncios com foto, preço e estoque (usando o mesmo formato de blocos separados por `--`).
- Enquanto o vendedor digita o preço, aparece: "Preço R$ 10,00 · Taxa da loja (20%) R$ 2,00 · **Você recebe R$ 8,00**".
- Vendedores não podem colocar anúncios em destaque. Só você controla destaque, categorias, ativar/desativar e remover anúncios.
- Os anúncios aparecem na loja com o nome do vendedor.

**Carteira (nova aba)**
- **Vendedor:** saldo "Em garantia", que fica preso por 3 dias após a venda, e saldo "Disponível para saque". Tem também o histórico de vendas e o botão "Solicitar saque" com a chave Pix dele.
- **Dono (você):** saldo total da loja com os 20% de cada venda e as vendas dos seus próprios produtos. Você pode sacar a qualquer momento. Há também a lista de saques pedidos pelos vendedores, com os botões "Paguei" e "Recusar".
- Se você reembolsar um pedido nos 3 dias de garantia, o valor sai da carteira do vendedor.

**Notificações**
- No celular: você ativa uma vez no painel com "Ativar avisos neste celular" e recebe um alerta a cada Pix enviado, novo vendedor e pedido de saque. No iPhone, primeiro é preciso adicionar o site à tela de início.
- No site: um sino no painel com um contador e um aviso na tela em tempo real.

## Limites (seja transparente com os vendedores)
- O dinheiro entra fisicamente no seu Nubank. A "carteira" é um controle do quanto você deve a cada vendedor, e os saques são Pix que você mesmo envia.
- Guardar dinheiro de terceiros pode exigir cuidados legais e fiscais no Brasil. Vale falar com um contador.

## Detalhes técnicos
- Novas tabelas: `seller_profiles` (chave Pix, status), `wallet_entries` (lançamentos: `sale_credit`, `fee_credit`, `refund_debit`, `withdrawal`, com `release_at` igual a `paid_at` + 3 dias), `withdrawals` (pendente/pago/recusado) e `push_subscriptions`. Todas com GRANTs e RLS: o vendedor vê só os próprios dados e o admin vê tudo.
- `products.seller_id` pode ser nulo (nulo = produto da loja). Um trigger impede que vendedores alterem `featured`. O estoque do vendedor é visível só para ele e para o admin.
- `approve_order` passa a gerar os lançamentos 80/20 por item (em centavos, com arredondamento a favor do vendedor). Os saldos são calculados comparando `release_at` com a data atual, sem necessidade de tarefa agendada.
- Web Push com service worker e chaves VAPID geradas como segredo. O envio acontece em uma função de servidor chamada quando o pedido vai para "em análise". Tempo real no painel pelas mudanças da tabela `orders`.
- Novas rotas: `/vender` (anúncios do vendedor), `/carteira` e aba Carteira/Saques no `/admin`.
