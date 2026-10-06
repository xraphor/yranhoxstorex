export const COPILOT_MODELS = [
  {
    id: "ollama-qwen",
    label: "Qwen 3 · seu PC",
    provider: "ollama",
    model: "qwen3:8b",
    description:
      "Requer Ollama com Qwen 3 instalado e conexão protegida. O PC precisa permanecer ligado.",
  },
] as const;
export type CopilotModelId = (typeof COPILOT_MODELS)[number]["id"];
export function findCopilotModel(id: string) {
  return COPILOT_MODELS.find((model) => model.id === id);
}
