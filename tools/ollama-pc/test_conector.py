import http.client
import json
import threading
import unittest
from conector import make_server


class BridgeTest(unittest.TestCase):
    def setUp(self):
        self.calls = []
        def sender(payload):
            self.calls.append(payload)
            return b'{"choices":[]}'
        self.server = make_server("test-token", 0, sender)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()

    def send(self, path="/v1/chat/completions", token="test-token", model="qwen3:8b"):
        conn = http.client.HTTPConnection(*self.server.server_address, timeout=3)
        body = json.dumps({"model": model, "messages": [], "stream": True, "max_tokens": 999999})
        conn.request("POST", path, body, {"Authorization": "Bearer " + token})
        res = conn.getresponse()
        status = res.status
        res.read()
        conn.close()
        return status

    def test_auth_path_and_model_blocked_before_forwarding(self):
        self.assertEqual(self.send(token="wrong"), 401)
        self.assertEqual(self.send(path="/api/pull"), 404)
        self.assertEqual(self.send(model="other"), 400)
        self.assertEqual(self.calls, [])

    def test_forwarding_clamps_generation_and_disables_streaming(self):
        self.assertEqual(self.send(), 200)
        self.assertEqual(len(self.calls), 1)
        self.assertEqual(self.calls[0]["max_tokens"], 2048)
        self.assertIs(self.calls[0]["stream"], False)


if __name__ == "__main__":
    unittest.main()
