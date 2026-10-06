import { COPILOT_MODELS, findCopilotModel } from "./copilot-models.ts";

export function resolveCopilotProvider(id: string, env: Record<string, string | undefined>) {
  const selection = findCopilotModel(id);
  if (!selection) throw new Error("Modelo não permitido");
  if (selection.provider === "groq") {
    if (!env["GROQ_API_KEY"]) throw new Error("Configure GROQ_API_KEY nos segredos do servidor.");
    return {
      apiKey: env["GROQ_API_KEY"],
      model: selection.model,
      endpoint: "https://api.groq.com/openai/v1/chat/completions",
      provider: selection.provider,
    };
  }
  if (selection.provider === "openrouter") {
    if (!env["OPENROUTER_API_KEY"])
      throw new Error("Configure OPENROUTER_API_KEY nos segredos do servidor.");
    return {
      apiKey: env["OPENROUTER_API_KEY"],
      model: selection.model,
      endpoint: "https://openrouter.ai/api/v1/chat/completions",
      provider: selection.provider,
    };
  }
  if (!env["OLLAMA_BASE_URL"])
    throw new Error(
      "Conecte um servidor Ollama usando OLLAMA_BASE_URL; esta opção não funciona sem um modelo instalado.",
    );
  const base = new URL(env["OLLAMA_BASE_URL"]);
  if (base.username || base.password || base.search || base.hash)
    throw new Error("OLLAMA_BASE_URL inválida");
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(base.hostname);
  if (base.protocol !== "https:" && !(base.protocol === "http:" && loopback))
    throw new Error("O servidor Ollama remoto deve usar HTTPS.");
  return {
    apiKey: env["OLLAMA_ACCESS_TOKEN"] ?? "",
    model: selection.model,
    endpoint: `${base.toString().replace(/\/$/, "")}/chat/completions`,
    provider: selection.provider,
  };
}

export function copilotModelAvailability(env: Record<string, string | undefined>) {
  return COPILOT_MODELS.map((model) => {
    try {
      resolveCopilotProvider(model.id, env);
      return { ...model, configured: true, reason: "" };
    } catch (error) {
      return {
        ...model,
        configured: false,
        reason: error instanceof Error ? error.message : "Configuração pendente",
      };
    }
  });
}
