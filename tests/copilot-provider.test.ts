import assert from "node:assert/strict";
import { test } from "node:test";
import {
  resolveCopilotProvider,
  copilotModelAvailability,
} from "../src/lib/copilot-provider.server.ts";
test("removed providers cannot be called even with their old keys configured", () => {
  for (const id of ["groq-120b", "groq-20b", "openrouter-free", "ollama-qwen", "https://evil.test"])
    assert.throws(
      () => resolveCopilotProvider(id, { GROQ_API_KEY: "test", OPENROUTER_API_KEY: "test" }),
      /Modelo não permitido/,
    );
});
test("Mistral requires its own server credential and never exposes it in availability", () => {
  assert.throws(() => resolveCopilotProvider("mistral-small", {}), /MISTRAL_API_KEY/);
  assert.throws(
    () => resolveCopilotProvider("mistral-small", { MISTRAL_API_KEY: "  " }),
    /MISTRAL_API_KEY/,
  );
  assert.equal(
    resolveCopilotProvider("mistral-small", { MISTRAL_API_KEY: "test" }).model,
    "mistral-small-latest",
  );
  const pending = copilotModelAvailability({});
  assert.equal(pending.length, 1);
  assert.equal(pending[0].configured, false);
  const ready = copilotModelAvailability({ MISTRAL_API_KEY: "private-test-secret" });
  assert.equal(ready[0].configured, true);
  assert.ok(!JSON.stringify(ready).includes("private-test-secret"));
});
