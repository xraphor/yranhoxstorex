# Pixel Vault

Crie uma aplicação web completa de e-commerce digital chamada "yRanhox Store X", focada em venda de produtos digitais (contas, chaves de ativação/keys, itens de jogos, scripts e licenças) com entrega automática pós-pagamento via Pix, visual gamer premium e painel de administração restrito.



---



### 1. IDENTIDADE VISUAL & TEMA

- **Nome da Loja:** yRanhox Store X

- **Estilo:** Dark theme moderno gamer/tech (paleta base com fundo cinza escuro/preto `#0b0e14`, tons de cinza grafite para cards `#151922`, e detalhes com neon/accent em roxo elétrico `#8b5cf6` ou ciano brilhante `#06b6d4`).

- **Personalização de Temas:**

  - Crie um seletor visual na interface para o usuário alternar estilos de cor de destaque (ex: Roxo Neon, Ciano Cyber, Verde Esmeralda, Laranja Vulcão).

  - Animações suaves em hover, botões com efeito de brilho sutil (glow) e tipografia moderna (Inter / Rajdhani / Orbitron).



---



### 2. AUTENTICAÇÃO E PERMISSÕES (SUPABASE AUTH & RBAC)

- Integração de login/cadastro com Supabase Auth (E-mail + Senha e Login Social/Google).

- **REGRA CRÍTICA DE ADMINISTRAÇÃO:**

  - Apenas e exclusivamente a conta com o e-mail `raphael900001@gmail.com` terá a role de `admin`.

  - Qualquer outro usuário registrado receberá estritamente o papel de `buyer` (comprador).

  - Implementar verificação tanto no front-end quanto nas políticas de segurança de banco (Row Level Security - RLS) para garantir que a rota `/admin` seja acessível unicamente se `auth.jwt() -> email = 'raphael900001@gmail.com'`.

  - Caso qualquer outro usuário tente acessar `/admin`, redirecionar imediatamente para a página inicial com toast: "Acesso não autorizado".



---



### 3. CATÁLOGO E EXPERIÊNCIA DO COMPRADOR

- **Página Inicial:**

  - Banner dinâmico com novidades e destaques da yRanhox Store X.

  - Barra de busca rápida em tempo real e filtros por categoria (Jogos, Contas, Keys, Scripts, Métodos).

  - Cards de produto com: Imagem/Thumbnail, Nome, Categoria, Preço original com desconto, Status de estoque ("Em Estoque" / "Esgotado") e botão "Comprar Agora".

- **Página do Produto:**

  - Galeria de imagens, descrição detalhada em Markdown/HTML, tags, termos de garantia e botão de compra instantânea.

- **Painel do Cliente (`/minha-conta` ou `/meus-pedidos`):**

  - Histórico de pedidos realizados.

  - Tela de visualização e cópia do produto digital entregue (ex: botão "Copiar Chave/Login").



---



### 4. CHECKOUT E ENTREGA AUTOMÁTICA VIA PIX

- **Fluxo de Pagamento Pix:**

  - Checkout simplificado (1-Click ou modal flutuante).

  - Integração com gateway de pagamento Pix (estrutura pronta para Mercado Pago / Asaas / Efi).

  - Geração dinâmica de QR Code visual e código "Pix Copia e Cola", com contador de expiração (ex: 15 minutos).

- **Sistema de Entrega Instantânea (Edge Function / Webhook):**

  - O sistema deve monitorar a confirmação do pagamento via Webhook.

  - No momento em que o status mudar para "Aprovado/Pago":

    1. O sistema reserva e retira automaticamente 1 item/estoque da tabela de conteúdos do produto (`product_stock_items`).

    2. O conteúdo digital (login, chave, link privado ou texto de ativação) é liberado imediatamente na tela do cliente.

    3. O cliente recebe uma confirmação na tela e o item fica salvo permanentemente no painel dele.

    4. Notificação visual de sucesso com som ou animação de confetes.



---



### 5. PAINEL ADMINISTRATIVO EXCLUSIVO (`/admin`)

(Apenas para `raphael900001@gmail.com`)

- **Dashboard / Visão Geral:**

  - Faturamento total (diário, semanal e mensal via Pix).

  - Total de pedidos aprovados, pendentes e cancelados.

  - Alerta de produtos com estoque baixo.

- **Gerenciamento de Produtos:**

  - Criar, editar e excluir produtos (Título, Descrição, Preço, Categoria, Imagens).

  - **Gerenciador de Estoque Digital:** Campo para colar várias keys/linhas de dados de uma vez só (ex: 1 chave por linha) que serão entregues uma a uma conforme as vendas ocorrem.

- **Gestão de Pedidos:**

  - Listagem completa de transações, status do Pix, e-mail do comprador e produto entregue, com opção de reenviar ou reembolsar se necessário.

- **Configurações da Loja:**

  - Edição de banners, avisos no topo do site, chaves de API do gateway de pagamento Pix e links de redes sociais/suporte.



---



### 6. TECNOLOGIA E BANCO DE DADOS

- React + Tailwind CSS + Lucide Icons + Shadcn UI para interface responsiva (Mobile first e Desktop).

- Supabase (PostgreSQL) com tabelas: `profiles`, `products`, `product_stock_items`, `orders`, `ord

er_items`.

- Row Level Security (RLS) habilitado em todas as tabelas.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://yranhoxstorex.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/da709d7d-77e9-4b74-ac83-e8e037009f8a).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Copiloto: conversas salvas

O painel administrativo permite iniciar uma conversa ou reabrir um histórico salvo.
Mensagens e ferramentas executadas ficam nas tabelas `admin_copilot_threads` e
`admin_copilot_messages`, usando as migrations existentes de 3 de outubro de 2026.
Todos os endpoints verificam o administrador e o dono da conversa; as consultas
usam o cliente autenticado com RLS. A IA recebe as últimas 20 mensagens válidas
da conversa selecionada, carregadas no servidor.

Para validar localmente (Node.js 22.6 ou mais recente):

```sh
npm test
npx tsc --noEmit
npm run build
```

A validação completa com o administrador exige as configurações de servidor do
Supabase e `GROQ_API_KEY`. Esta etapa implementa histórico por conversa; memória
entre conversas e anexos de mídia continuam pendentes no roadmap.

## Provedor externo do Copiloto

O Copiloto usa diretamente a Groq; não há fallback para o gateway de IA do Lovable.
Configure `GROQ_API_KEY` nos segredos do runtime de servidor que hospeda o TanStack Start.
Não use prefixo `VITE_`, não coloque a chave em arquivos versionados e não exponha no navegador.
`GROQ_MODEL` é opcional e usa `openai/gpt-oss-120b` por padrão.
O plano gratuito da Groq tem cotas próprias; trocar a IA não elimina custos de hospedagem.
A integração preserva as ferramentas administrativas e o histórico de conversas.
Os testes locais usam respostas simuladas; valide a conexão real após configurar o segredo.

## Escolha de modelos

O seletor do Copiloto oferece Groq GPT OSS 120B e 20B (usam `GROQ_API_KEY`),
OpenRouter gratuito (`OPENROUTER_API_KEY`) e Ollama Qwen 3/Llama 3.1.
O OpenRouter usa apenas `openrouter/free`, exige suporte aos parâmetros enviados
e restringe o preço de entrada/saída a zero; sua disponibilidade e cotas variam.
A escolha feita no painel se aplica à próxima mensagem. O histórico permanece
na conversa selecionada. As credenciais nunca são devolvidas ao navegador.

Para as opções sem chave, instale os modelos `qwen3:8b` e `llama3.1:8b` em um
servidor Ollama. Configure `OLLAMA_BASE_URL` com a base compatível OpenAI terminada
em `/v1`, alcançável pelo servidor da loja. O `localhost` da hospedagem não é seu PC.
Use HTTPS e acesso restrito para uma conexão remota; `OLLAMA_ACCESS_TOKEN` pode
ser configurado se um proxy exigir autenticação. Não exponha o Ollama sem proteção.
A hospedagem continua necessária e o computador/servidor precisa permanecer ligado.
Não há integração com sites de chat sem API.

Erros 429 mostram o Retry-After do provedor quando disponível, sem repetir
automaticamente ações administrativas. O teto de saída foi reduzido a 2048 tokens.
O seletor substitui o antigo override global `GROQ_MODEL`.
