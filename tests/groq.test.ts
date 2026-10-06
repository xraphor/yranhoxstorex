import assert from "node:assert/strict";
import { test } from "node:test";
import { callGroq } from "../src/lib/groq.server.ts";

const options = {
  apiKey: "test-placeholder",
  model: "openai/gpt-oss-120b",
  system: "Administração",
  messages: [{ role: "user" as const, content: "Crie um produto" }],
  tools: [
    { type: "function", function: { name: "criar_produto", parameters: { type: "object" } } },
  ],
};

test("sends server tool definitions to Groq and preserves tool call IDs", async () => {
  const request: typeof fetch = async (url, init) => {
    assert.equal(url, "https://api.groq.com/openai/v1/chat/completions");
    assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer test-placeholder");
    const body = JSON.parse(String(init?.body));
    assert.deepEqual(body.tools, options.tools);
    assert.equal(body.messages[0].role, "system");
    assert.equal(body.parallel_tool_calls, false);
    assert.equal(body.stream, false);
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
  const result = await callGroq(options, request);
  assert.ok("message" in result);
  assert.equal(result.message.tool_calls?.[0]?.id, "call_1");
  const followup = await callGroq(
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
    assert.deepEqual(await callGroq(options, async () => Response.json(response)), { error: 502 });
});

test("keeps upstream error bodies private and handles refusal", async () => {
  assert.deepEqual(
    await callGroq(options, async () => new Response("private prompt", { status: 429 })),
    { error: 429, retryAfter: 0 },
  );
  const result = await callGroq(options, async () =>
    Response.json({ choices: [{ finish_reason: "content_filter", message: { content: null } }] }),
  );
  assert.ok("message" in result);
  assert.equal(result.refusal, true);
});

test("reports Retry-After and routes only to free OpenRouter models", async () => {
  const limited = await callGroq(
    options,
    async () => new Response("", { status: 429, headers: { "retry-after": "12" } }),
  );
  assert.deepEqual(limited, { error: 429, retryAfter: 12 });
  await callGroq(
    {
      ...options,
      provider: "openrouter",
      endpoint: "https://openrouter.ai/api/v1/chat/completions",
      model: "openrouter/free",
    },
    async (url, init) => {
      assert.equal(url, "https://openrouter.ai/api/v1/chat/completions");
      const body = JSON.parse(String(init?.body));
      assert.equal(body.model, "openrouter/free");
      assert.deepEqual(body.provider.max_price, { prompt: 0, completion: 0 });
      assert.equal(body.max_tokens, 2048);
      return Response.json({
        choices: [{ finish_reason: "stop", message: { content: "Resposta" } }],
      });
    },
  );
});
