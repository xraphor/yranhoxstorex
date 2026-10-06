import { z } from "zod";

const ToolCall = z.object({
  id: z.string().min(1),
  type: z.literal("function"),
  function: z.object({ name: z.string().min(1), arguments: z.string() }),
});
export type GroqToolCall = z.infer<typeof ToolCall>;
export type GroqMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: GroqToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

const Completion = z.object({
  choices: z
    .array(
      z.object({
        finish_reason: z.string().nullable(),
        message: z.object({
          content: z.string().nullable().optional(),
          refusal: z.string().nullable().optional(),
          tool_calls: z.array(ToolCall).optional(),
        }),
      }),
    )
    .min(1),
});

export async function callGroq(
  options: {
    apiKey: string;
    model: string;
    system: string;
    messages: GroqMessage[];
    tools: readonly unknown[];
  },
  request: typeof fetch = fetch,
) {
  const response = await request("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${options.apiKey}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(60000),
    body: JSON.stringify({
      model: options.model,
      messages: [{ role: "system", content: options.system }, ...options.messages],
      tools: options.tools,
      tool_choice: "auto",
      parallel_tool_calls: false,
      max_completion_tokens: 4096,
      stream: false,
    }),
  });
  // Do not return or log upstream error bodies, which may contain private prompts.
  if (!response.ok) return { error: response.status } as const;
  const parsed = Completion.safeParse(await response.json());
  if (!parsed.success) return { error: 502 } as const;
  const choice = parsed.data.choices[0]!;
  const calls = choice.message.tool_calls ?? [];
  if (choice.finish_reason === "length") return { error: 502 } as const;
  return {
    message: {
      role: "assistant" as const,
      content: choice.message.content ?? null,
      ...(calls.length ? { tool_calls: calls } : {}),
    },
    refusal: Boolean(choice.message.refusal || choice.finish_reason === "content_filter"),
  };
}
