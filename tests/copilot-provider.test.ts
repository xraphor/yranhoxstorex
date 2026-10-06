import assert from "node:assert/strict";
import { test } from "node:test";
import {
  resolveCopilotProvider,
  copilotModelAvailability,
} from "../src/lib/copilot-provider.server.ts";

test("uses only allowed model IDs and the selected provider credential", () => {
  assert.throws(() => resolveCopilotProvider("https://evil.test", {}), /Modelo não permitido/);
  assert.throws(
    () => resolveCopilotProvider("openrouter-free", { GROQ_API_KEY: "test" }),
    /OPENROUTER_API_KEY/,
  );
  const provider = resolveCopilotProvider("openrouter-free", { OPENROUTER_API_KEY: "test" });
  assert.equal(provider.model, "openrouter/free");
  assert.equal(provider.endpoint, "https://openrouter.ai/api/v1/chat/completions");
});

test("availability never returns keys or endpoint configuration", () => {
  const options = copilotModelAvailability({ GROQ_API_KEY: "private-test-secret" });
  assert.equal(options.filter((option) => option.configured).length, 2);
  assert.ok(!JSON.stringify(options).includes("private-test-secret"));
  assert.deepEqual(
    options.map((option) => option.id),
    ["groq-120b", "groq-20b", "openrouter-free"],
  );
});

test("rejects local models while that integration is disabled", () => {
  assert.throws(() => resolveCopilotProvider("ollama-qwen", {}), /Modelo não permitido/);
  assert.throws(() => resolveCopilotProvider("ollama-llama", {}), /Modelo não permitido/);
});
