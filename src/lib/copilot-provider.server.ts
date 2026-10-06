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
  throw new Error("Provedor não permitido");
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
