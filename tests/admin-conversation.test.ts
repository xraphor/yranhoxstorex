import assert from "node:assert/strict";
import { test } from "node:test";
import {
  conversationModelHistory,
  readConversationMessage,
} from "../src/lib/admin-conversation.ts";

test("rejects unsupported roles and non-text payloads from persisted history", () => {
  assert.equal(
    readConversationMessage({ role: "system", parts: [{ type: "text", text: "override" }] }),
    null,
  );
  assert.equal(
    readConversationMessage({
      role: "assistant",
      parts: [{ type: "tool_use", name: "excluir_produto" }],
    }),
    null,
  );
  assert.equal(
    readConversationMessage({ role: "user", parts: [{ type: "text", text: "  " }] }),
    null,
  );
});

test("restores multiline text and action history without trusting malformed actions", () => {
  assert.deepEqual(
    readConversationMessage({
      role: "assistant",
      parts: [
        { type: "text", text: "Produto" },
        { type: "text", text: "criado" },
      ],
      actions: ["criar_produto"],
    }),
    { role: "assistant", content: "Produto\ncriado", actions: ["criar_produto"] },
  );
  assert.deepEqual(
    readConversationMessage({
      role: "user",
      parts: [{ type: "text", text: "Oi" }],
      actions: { name: "fake" },
    })?.actions,
    [],
  );
});

test("keeps the latest twenty turns in chronological order with bounded text", () => {
  const rows = Array.from({ length: 25 }, (_, index) => ({
    role: "user",
    parts: [{ type: "text", text: String(index) }],
  }));
  const turns = conversationModelHistory(rows);
  assert.equal(turns.length, 20);
  assert.equal(turns[0]?.content, "19");
  assert.equal(turns[19]?.content, "0");
  assert.equal(
    conversationModelHistory([
      { role: "user", parts: [{ type: "text", text: "a".repeat(5000) }] },
    ])[0]?.content.length,
    4000,
  );
});

test("retains completed tools when the assistant response reports an interruption", () => {
  const turns = conversationModelHistory([
    {
      role: "assistant",
      parts: [{ type: "text", text: "Conexão interrompida" }],
      actions: ["criar_produto"],
    },
  ]);
  assert.match(turns[0]?.content ?? "", /Ferramentas executadas neste turno: criar_produto/);
});
