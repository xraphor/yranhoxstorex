import assert from "node:assert/strict";
import { test } from "node:test";
import {
  resolveCopilotProvider,
  copilotModelAvailability,
} from "../src/lib/copilot-provider.server.ts";
test("old providers are rejected and the PC connection starts unconfigured", () => {
  for (const id of ["mistral-small", "groq-120b", "openrouter-free"])
    assert.throws(() => resolveCopilotProvider(id, {}), /Modelo não permitido/);
  assert.equal(copilotModelAvailability({})[0].configured, false);
});
test("requires protected HTTPS and keeps URL and token server-side", () => {
  const env = {
    OLLAMA_BASE_URL: "https://pc.example/v1",
    OLLAMA_ACCESS_TOKEN: "private-test-token",
  };
  assert.equal(
    resolveCopilotProvider("ollama-qwen", env).endpoint,
    "https://pc.example/v1/chat/completions",
  );
  for (const url of [
    "http://pc.example/v1",
    "https://user:pass@pc.example/v1",
    "https://pc.example/v1?key=x",
    "https://pc.example/api",
  ])
    assert.throws(() => resolveCopilotProvider("ollama-qwen", { ...env, OLLAMA_BASE_URL: url }));
  assert.throws(() =>
    resolveCopilotProvider("ollama-qwen", { OLLAMA_BASE_URL: env.OLLAMA_BASE_URL }),
  );
  const publicConfig = JSON.stringify(copilotModelAvailability(env));
  assert.ok(!publicConfig.includes(env.OLLAMA_ACCESS_TOKEN));
  assert.ok(!publicConfig.includes("pc.example"));
});
