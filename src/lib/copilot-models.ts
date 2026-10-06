export const COPILOT_MODELS = [
  {
    id: "groq-120b",
    label: "Groq · GPT OSS 120B",
    provider: "groq",
    model: "openai/gpt-oss-120b",
    description: "Modelo atual da loja. Plano gratuito com limites.",
  },
  {
    id: "groq-20b",
    label: "Groq · GPT OSS 20B",
    provider: "groq",
    model: "openai/gpt-oss-20b",
    description: "Alternativa menor na mesma conta Groq; os limites do provedor continuam valendo.",
  },
  {
    id: "openrouter-free",
    label: "OpenRouter · Modelos gratuitos",
    provider: "openrouter",
    model: "openrouter/free",
    description:
      "Escolhe um modelo gratuito compatível com as ferramentas da loja. Disponibilidade variável.",
  },
  {
    id: "ollama-qwen",
    label: "Ollama · Qwen 3 (sem chave)",
    provider: "ollama",
    model: "qwen3:8b",
    description: "Precisa de um computador ou servidor com Ollama conectado à loja e ligado.",
  },
  {
    id: "ollama-llama",
    label: "Ollama · Llama 3.1 (sem chave)",
    provider: "ollama",
    model: "llama3.1:8b",
    description: "Precisa de um computador ou servidor com Ollama conectado à loja e ligado.",
  },
] as const;
export type CopilotModelId = (typeof COPILOT_MODELS)[number]["id"];
export function findCopilotModel(id: string) {
  return COPILOT_MODELS.find((model) => model.id === id);
}
