"""Conector local da loja. Python 3.12+, sem dependencias externas."""
import hmac
import json
import os
from pathlib import Path
import secrets
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.request import Request, build_opener, ProxyHandler, HTTPRedirectHandler
from urllib.error import HTTPError, URLError

MAX_BODY = 262144
MAX_RESPONSE = 4194304
UPSTREAM = "http://127.0.0.1:11434/v1/chat/completions"


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


def forward(payload):
    opener = build_opener(ProxyHandler({}), NoRedirect())
    request = Request(UPSTREAM, data=json.dumps(payload).encode(),
                      headers={"Content-Type": "application/json"}, method="POST")
    with opener.open(request, timeout=55) as response:
        body = response.read(MAX_RESPONSE + 1)
        if len(body) > MAX_RESPONSE:
            raise ValueError("Resposta muito grande")
        json.loads(body)
        return body


def make_server(token, port=8765, sender=forward):
    gate = threading.BoundedSemaphore(1)

    class Handler(BaseHTTPRequestHandler):
        def setup(self):
            super().setup()
            self.connection.settimeout(10)

        def log_message(self, *args):
            pass  # Nunca registrar prompts, cabecalhos ou senha.

        def reply(self, status, message):
            body = json.dumps({"error": {"code": status, "message": message}}).encode()
            self.send_body(status, body)

        def send_body(self, status, body):
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("Connection", "close")
            if status == 429:
                self.send_header("Retry-After", "5")
            self.end_headers()
            self.wfile.write(body)
            self.close_connection = True

        def do_GET(self):
            self.reply(405, "Use o teste de conexao da loja.")

        def do_POST(self):
            supplied = self.headers.get("Authorization", "").encode()
            expected = ("Bearer " + token).encode()
            if not hmac.compare_digest(supplied, expected):
                self.reply(401, "Acesso negado")
                return
            if self.path != "/v1/chat/completions":
                self.reply(404, "Rota nao permitida")
                return
            if self.headers.get("Transfer-Encoding"):
                self.reply(400, "Formato nao permitido")
                return
            try:
                size = int(self.headers.get("Content-Length", "0"))
                if size < 1 or size > MAX_BODY:
                    self.reply(413, "Pedido muito grande ou vazio")
                    return
                data = json.loads(self.rfile.read(size))
                if not isinstance(data, dict) or data.get("model") != "qwen3:8b":
                    self.reply(400, "Modelo nao permitido")
                    return
                if not isinstance(data.get("messages"), list):
                    self.reply(400, "Mensagens invalidas")
                    return
                payload = {key: data[key] for key in (
                    "model", "messages", "tools", "tool_choice") if key in data}
                payload.update(stream=False, max_tokens=2048)
            except (ValueError, OSError):
                self.reply(400, "Pedido invalido")
                return
            if not gate.acquire(blocking=False):
                self.reply(429, "O PC esta respondendo a outro pedido")
                return
            try:
                self.send_body(200, sender(payload))
            except HTTPError as error:
                status = error.code if 400 <= error.code <= 599 else 502
                self.reply(status, "O Ollama recusou o pedido")
            except (URLError, TimeoutError, OSError, ValueError):
                self.reply(502, "Ollama indisponivel ou resposta demorou demais")
            finally:
                gate.release()

    return ThreadingHTTPServer(("127.0.0.1", port), Handler)


def main():
    folder = Path(os.environ.get("LOCALAPPDATA", str(Path.home()))) / "yRanhox-Ollama"
    folder.mkdir(parents=True, exist_ok=True)
    token_file = folder / "conector.token"
    if not token_file.exists():
        token_file.write_text(secrets.token_urlsafe(32), encoding="utf-8")
        if os.name != "nt":
            token_file.chmod(0o600)
    token = token_file.read_text(encoding="utf-8").strip()
    if len(token) < 32 or not token.isascii():
        raise ValueError("Senha local invalida. Remova conector.token para gerar outra.")
    server = make_server(token)
    print("Conector da loja iniciado em 127.0.0.1:8765", flush=True)
    print("Cole esta senha SOMENTE no segredo OLLAMA_ACCESS_TOKEN do projeto:", flush=True)
    print(token, flush=True)
    print("Nao envie a senha em prints. Deixe esta janela aberta.", flush=True)
    print("Proximo passo em OUTRO terminal:", flush=True)
    print("cloudflared tunnel --url http://127.0.0.1:8765", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
