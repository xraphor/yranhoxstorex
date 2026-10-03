# Copiloto Admin X — memória, histórico e mídia

## Objetivo
Transformar o Copiloto atual em uma central administrativa completa, com várias conversas salvas na nuvem, memória permanente da loja, respostas em tempo real e capacidade de analisar imagens e vídeos para criar ou atualizar produtos.

## Experiência do administrador
- Criar uma área dedicada em `/admin/copilot/:threadId`, mantendo o acesso exclusivo de `raphael900001@gmail.com`.
- Exibir uma barra lateral com conversas, busca, novo chat, renomear e excluir.
- Restaurar a conversa correta ao abrir seu endereço ou atualizar a página, sem misturar mensagens entre chats.
- Criar um visual gamer premium usando a identidade de raio da yRanhox, mensagens mais legíveis, respostas em Markdown, indicador de raciocínio, ações executadas recolhidas e botões de copiar/parar.
- Manter o campo de mensagem focado e adaptar a tela para celular e computador.
- Permitir anexar várias imagens e um vídeo. Imagens serão analisadas diretamente; vídeos serão convertidos no navegador em quadros representativos para a IA analisar com segurança e menor custo.
- Mostrar anexos com miniaturas, progresso, remoção e erros claros antes do envio.

## Memória na nuvem
- Criar tabelas protegidas para conversas, mensagens e memórias do Copiloto, sempre vinculadas ao administrador autenticado.
- Guardar mensagens completas, anexos, ações realizadas, datas e título da conversa.
- Criar memória permanente separada do histórico para preferências, regras da loja, decisões e informações úteis que o administrador pedir para lembrar.
- Adicionar controles para visualizar, editar e apagar memórias; a IA poderá consultar e registrar memórias durante o trabalho.
- Aplicar permissões no banco para que compradores e visitantes não consigam ler ou alterar nenhum dado do Copiloto.

## Inteligência e ações
- Migrar o Copiloto para o modelo padrão mais capaz do Lovable AI, com raciocínio, streaming e histórico completo em cada chamada.
- Preservar e melhorar as ferramentas atuais de produtos, estoque, categorias, pedidos, comentários, relatórios, configurações e temas.
- Adicionar ferramentas para pesquisar itens específicos, duplicar produtos, ativar/desativar, definir imagens e galeria, consultar estoque detalhado, resumir desempenho e gerenciar memórias.
- Ao receber foto ou vídeo de um produto, extrair título, categoria, descrição comercial, tags, garantia e sugestão de preço; criar o produto quando a ordem pedir, usando a mídia enviada como imagem quando apropriado.
- Exigir aprovação visível antes de ações financeiras ou destrutivas; ações comuns de conteúdo continuam imediatas.
- Persistir resultados das ferramentas e atualizar o painel/catálogo após cada mudança concluída.

## Arquivos e rotas principais
- Substituir o painel simples em `src/components/store/AdminAiPanel.tsx` por uma composição baseada nos componentes oficiais de conversa, mensagem, ferramenta, anexos e campo de envio.
- Criar componentes focados para lista de conversas, memória e preparação de mídia em `src/components/store/copilot/`.
- Criar a página `src/routes/_authenticated/admin.copilot.$threadId.tsx` e um endpoint de streaming em `src/routes/api/admin-copilot.ts`.
- Separar provedor, ferramentas e persistência em módulos server-only dentro de `src/lib/`.
- Manter `src/lib/admin-ai.functions.ts` apenas para operações auxiliares de conversas/memórias ou substituí-lo pelas novas funções, sem expor chaves no navegador.
- Atualizar `src/routes/_authenticated/admin.tsx` para abrir o novo Copiloto e preservar as demais abas administrativas.

## Detalhes técnicos
- Usar AI SDK + Responses API com `openai/gpt-6-astra`, raciocínio configurado, `store: false`, histórico enviado integralmente, correlação de execução e limite seguro de etapas para ferramentas.
- Usar `UIMessage[]`, `useChat`, transporte padrão e `toUIMessageStreamResponse`; salvar a resposta concluída no encerramento do stream.
- Uploads ficam em armazenamento privado exclusivo do admin. O servidor baixa os anexos autorizados; arquivos nunca recebem acesso público irrestrito.
- Vídeo não será enviado cru ao modelo: o navegador captura quadros distribuídos do vídeo e envia os quadros mais o nome, duração e tipo do arquivo.
- Validar tipos e tamanhos; aceitar imagens JPG/PNG/WebP/GIF e vídeos MP4/WebM/MOV dentro de limites exibidos na interface.
- Toda leitura, criação, alteração e exclusão passa por autenticação e pela verificação de e-mail administrativo já usada no projeto.

## Verificação
- Confirmar que comprador e visitante são bloqueados tanto da página quanto dos dados e do endpoint.
- Criar duas conversas, enviar mensagens diferentes, atualizar e alternar entre elas sem vazamento de conteúdo.
- Anexar imagem e vídeo, criar um produto a partir da mídia e conferir o produto, a imagem e o histórico restaurado.
- Testar memória em uma conversa nova, criação/edição de produto, ação destrutiva com aprovação e parada de resposta.
- Revisar celular e computador, erros do navegador, chamadas de rede e compilação final.
