import assert from "node:assert/strict";
import { test } from "node:test";
import { callOllama } from "../src/lib/ollama.server.ts";

const options = {
  apiKey: "test-placeholder",
  endpoint: "https://pc.example/v1/chat/completions",
  model: "qwen3:8b",
  system: "Administração",
  messages: [{ role: "user" as const, content: "Crie um produto" }],
  tools: [
    { type: "function", function: { name: "criar_produto", parameters: { type: "object" } } },
  ],
};

test("sends server tool definitions to Ollama and preserves tool call IDs", async () => {
  const request: typeof fetch = async (url, init) => {
    assert.equal(url, "https://pc.example/v1/chat/completions");
    assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer test-placeholder");
    const body = JSON.parse(String(init?.body));
    assert.deepEqual(body.tools, options.tools);
    assert.equal(body.messages[0].role, "system");
    assert.equal(init?.redirect, "error");
    assert.equal(body.stream, false);
    assert.equal(body.max_tokens, 2048);
    assert.ok(!("provider" in body));
    return Response.json({
      choices: [
        {
          finish_reason: "tool_calls",
          message: {
            content: null,
            tool_calls: [
              {
                id: "call_1",
                type: "function",
                function: { name: "criar_produto", arguments: '{"title":"Produto"}' },
              },
            ],
          },
        },
      ],
    });
  };
  const result = await callOllama(options, request);
  assert.ok("message" in result);
  assert.equal(result.message.tool_calls?.[0]?.id, "call_1");
  const followup = await callOllama(
    {
      ...options,
      messages: [
        ...options.messages,
        result.message,
        { role: "tool", tool_call_id: "call_1", content: '{"ok":true}' },
      ],
    },
    async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      assert.equal(body.messages.at(-1).tool_call_id, "call_1");
      return Response.json({
        choices: [{ finish_reason: "stop", message: { content: "Criado" } }],
      });
    },
  );
  assert.ok("message" in followup);
  assert.equal(followup.message.content, "Criado");
});

test("rejects truncated or malformed completions before executing tools", async () => {
  for (const response of [
    { choices: [] },
    {
      choices: [
        {
          finish_reason: "length",
          message: {
            content: null,
            tool_calls: [
              {
                id: "call_1",
                type: "function",
                function: { name: "criar_produto", arguments: "{" },
              },
            ],
          },
        },
      ],
    },
  ])
    assert.deepEqual(await callOllama(options, async () => Response.json(response)), {
      error: 502,
      reason: response.choices.length ? "truncated" : "invalid_response",
    });
});

test("keeps upstream error bodies private and handles refusal", async () => {
  assert.deepEqual(
    await callOllama(options, async () => new Response("private prompt", { status: 429 })),
    { error: 429, retryAfter: 0 },
  );
  const result = await callOllama(options, async () =>
    Response.json({ choices: [{ finish_reason: "content_filter", message: { content: null } }] }),
  );
  assert.ok("message" in result);
  assert.equal(result.refusal, true);
});

test("reports Retry-After without retrying the request", async () => {
  let calls = 0;
  const result = await callOllama(options, async () => {
    calls++;
    return new Response("", { status: 429, headers: { "retry-after": "12" } });
  });
  assert.deepEqual(result, { error: 429, retryAfter: 12 });
  assert.equal(calls, 1);
});

test("preserves embedded error codes without exposing provider text or executing partial tools", async () => {
  const result = await callOllama(options, async () =>
    Response.json({
      error: { code: 404, message: "private prompt and credentials" },
      choices: [{ finish_reason: "tool_calls", message: { content: "partial" } }],
    }),
  );
  assert.deepEqual(result, { error: 404 });
});

test("invalid JSON is reported as an invalid response without exposing its body", async () => {
  assert.deepEqual(await callOllama(options, async () => new Response("private invalid body")), {
    error: 502,
    reason: "invalid_response",
  });
});

test("connection test validates the tool round trip without executing store tools", async () => {
  const { testOllamaConnection } = await import("../src/lib/ollama.server.ts");
  let count = 0;
  const result = await testOllamaConnection(options, async (_url, init) => {
    const body = JSON.parse(String(init?.body));
    assert.deepEqual(
      body.tools.map((t: { function: { name: string } }) => t.function.name),
      ["verificar_conexao"],
    );
    count++;
    if (count === 1)
      return Response.json({
        choices: [
          {
            finish_reason: "tool_calls",
            message: {
              content: null,
              tool_calls: [
                {
                  id: "123456789",
                  type: "function",
                  function: { name: "verificar_conexao", arguments: "{}" },
                },
              ],
            },
          },
        ],
      });
    assert.equal(body.messages.at(-1).tool_call_id, "123456789");
    return Response.json({ choices: [{ finish_reason: "stop", message: { content: "OK" } }] });
  });
  assert.equal(result.ok, true);
  assert.equal(count, 2);
  const unsupported = await testOllamaConnection(options, async () =>
    Response.json({
      choices: [{ finish_reason: "stop", message: { content: "Olá" } }],
    }),
  );
  assert.equal(unsupported.ok, false);
});
