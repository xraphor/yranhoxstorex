export const COPILOT_MODELS = [
  {
    id: "mistral-small",
    label: "Mistral Small",
    provider: "mistral",
    model: "mistral-small-latest",
    description:
      "Use uma conta Mistral em Free mode. Há limites de uso; teste a conexão antes de começar.",
  },
] as const;
export type CopilotModelId = (typeof COPILOT_MODELS)[number]["id"];
export function findCopilotModel(id: string) {
  return COPILOT_MODELS.find((model) => model.id === id);
}
