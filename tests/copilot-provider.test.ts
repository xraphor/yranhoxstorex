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
  assert.ok(
    options.filter((option) => option.provider === "ollama").every((option) => !option.configured),
  );
});

test("local models require a configured safe server endpoint but no API key", () => {
  assert.throws(
    () => resolveCopilotProvider("ollama-qwen", { OLLAMA_BASE_URL: "http://remote.test/v1" }),
    /HTTPS/,
  );
  assert.throws(
    () =>
      resolveCopilotProvider("ollama-qwen", {
        OLLAMA_BASE_URL: "https://user:password@remote.test/v1",
      }),
    /inválida/,
  );
  const provider = resolveCopilotProvider("ollama-qwen", {
    OLLAMA_BASE_URL: "http://localhost:11434/v1",
  });
  assert.equal(provider.apiKey, "");
  assert.equal(provider.endpoint, "http://localhost:11434/v1/chat/completions");
  assert.equal(provider.model, "qwen3:8b");
});
