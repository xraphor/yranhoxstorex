import { COPILOT_MODELS, findCopilotModel } from "./copilot-models.ts";

export function resolveCopilotProvider(id: string, env: Record<string, string | undefined>) {
  const selection = findCopilotModel(id);
  if (!selection) throw new Error("Modelo não permitido");
  const baseUrl = env["OLLAMA_BASE_URL"]?.trim();
  const apiKey = env["OLLAMA_ACCESS_TOKEN"]?.trim();
  if (!baseUrl || !apiKey)
    throw new Error(
      "Conexão com o PC pendente. Configure OLLAMA_BASE_URL e OLLAMA_ACCESS_TOKEN após instalar o Ollama e um proxy protegido.",
    );
  const base = new URL(baseUrl);
  if (base.protocol !== "https:" || base.username || base.password || base.search || base.hash)
    throw new Error("Use uma URL HTTPS sem credenciais, parâmetros ou fragmentos.");
  if (!base.pathname.replace(/\/$/, "").endsWith("/v1"))
    throw new Error("A URL protegida do Ollama deve terminar em /v1.");
  return {
    apiKey,
    model: selection.model,
    provider: selection.provider,
    endpoint: base.toString().replace(/\/$/, "") + "/chat/completions",
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
