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
    endpoint?: string;
    provider?: string;
    system: string;
    messages: GroqMessage[];
    tools: readonly unknown[];
  },
  request: typeof fetch = fetch,
) {
  const response = await request(
    options.endpoint ?? "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        ...(options.apiKey ? { Authorization: `Bearer ${options.apiKey}` } : {}),
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(60000),
      body: JSON.stringify({
        model: options.model,
        messages: [{ role: "system", content: options.system }, ...options.messages],
        tools: options.tools,
        tool_choice: "auto",
        ...(options.provider === "openrouter" ? {} : { parallel_tool_calls: false }),
        ...(options.provider === "groq" || !options.provider
          ? { max_completion_tokens: 2048 }
          : { max_tokens: 2048 }),
        ...(options.provider === "openrouter"
          ? { provider: { require_parameters: true, max_price: { prompt: 0, completion: 0 } } }
          : {}),
        stream: false,
      }),
    },
  );
  // Do not return or log upstream error bodies, which may contain private prompts.
  if (!response.ok) {
    const retry = response.headers.get("retry-after");
    const seconds =
      retry && /^\d+(\.\d+)?$/.test(retry)
        ? Math.ceil(Number(retry))
        : retry
          ? Math.ceil((Date.parse(retry) - Date.now()) / 1000)
          : 0;
    return {
      error: response.status,
      retryAfter: Number.isFinite(seconds) ? Math.max(0, Math.min(seconds, 86400)) : 0,
    } as const;
  }
  const body: unknown = await response.json().catch(() => null);
  // Some providers report generation failures inside an HTTP 200 response.
  const upstreamError = z
    .object({
      error: z.object({ code: z.number().int().min(400).max(599) }),
    })
    .safeParse(body);
  if (upstreamError.success) return { error: upstreamError.data.error.code } as const;
  const parsed = Completion.safeParse(body);
  if (!parsed.success) return { error: 502, reason: "invalid_response" } as const;
  const choice = parsed.data.choices[0]!;
  const calls = choice.message.tool_calls ?? [];
  if (choice.finish_reason === "length") return { error: 502, reason: "truncated" } as const;
  return {
    message: {
      role: "assistant" as const,
      content: choice.message.content ?? null,
      ...(calls.length ? { tool_calls: calls } : {}),
    },
    refusal: Boolean(choice.message.refusal || choice.finish_reason === "content_filter"),
  };
}
