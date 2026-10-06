# Conectar o PC da loja

Pré-requisitos: Python 3.12+, Ollama aberto e qwen3:8b instalado.
O conector só encaminha chat para o Ollama local, após validar uma senha.
Ele não publica arquivos do PC nem executa ferramentas administrativas localmente.

1. Baixe conector.py e execute com Python.
2. Copie a senha exibida para o segredo OLLAMA_ACCESS_TOKEN do servidor da loja.
   Não compartilhe essa senha. Ela é salva em LOCALAPPDATA/yRanhox-Ollama/conector.token.
3. Instale cloudflared seguindo https://developers.cloudflare.com/tunnel/downloads/
4. Em outro terminal execute:
   cloudflared tunnel --url http://127.0.0.1:8765
5. Copie a URL HTTPS exibida, acrescente /v1 e salve como OLLAMA_BASE_URL.
6. Publique os segredos/atualização e use Testar conexão no painel da loja.

Exemplo apenas: https://endereco-gerado.trycloudflare.com/v1.
Não use localhost ou a porta 11434 como URL pública.
Mantenha Ollama, conector e túnel funcionando. Ctrl+C encerra o conector/túnel.
Quick Tunnel é temporário, para testar; a URL muda ao reiniciar e deve ser atualizada
no segredo. Não oferece garantia de disponibilidade para produção.
Os pedidos passam pelo serviço Cloudflare. O token protege o endpoint; a URL não é
uma senha. Nenhuma chave paga de IA é necessária.
O conector não instala programas nem cria túnel automaticamente.
Se o modelo demorar mais de 55 segundos, o pedido falha sem repetição automática.
