import { COPILOT_MODELS, findCopilotModel } from "./copilot-models.ts";

export function resolveCopilotProvider(id: string, env: Record<string, string | undefined>) {
  const selection = findCopilotModel(id);
  if (!selection) throw new Error("Modelo não permitido");
  const apiKey = env["MISTRAL_API_KEY"]?.trim();
  if (!apiKey)
    throw new Error(
      "Configure MISTRAL_API_KEY nos segredos do servidor usando uma conta Mistral em Free mode.",
    );
  return { apiKey, model: selection.model, provider: selection.provider };
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
