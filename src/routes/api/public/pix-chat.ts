import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(2000),
});

const BodySchema = z.object({
  messages: z.array(MessageSchema).min(1).max(30),
  productTitle: z.string().max(200).optional(),
  totalBrl: z.string().max(30).optional(),
});

const SYSTEM_PROMPT = `Você é o assistente de suporte da yRanhox Store X, uma loja de produtos digitais.
O cliente acabou de avisar que enviou o pagamento Pix e o pedido está em análise.

Seu papel:
- Acalmar o cliente com um tom simpático, humano e positivo, em português do Brasil.
- Explicar que o aviso de pagamento foi recebido e que a equipe está confirmando o Pix.
- Reforçar que, assim que o pagamento for confirmado, o produto digital é liberado automaticamente na mesma tela e fica salvo em "Meus pedidos".
- Dizer que a página atualiza sozinha, sem precisar sair ou recarregar.
- Responder dúvidas comuns: prazo de confirmação (geralmente poucos minutos em horário comercial), segurança da compra, garantia do produto.
- Nunca prometer liberação imediata nem inventar status de pagamento. Nunca peça dados bancários, senhas ou códigos.
- Seja breve: respostas de 2 a 4 frases, com emojis leves quando combinar.`;

export const Route = createFileRoute("/api/public/pix-chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: z.infer<typeof BodySchema>;
        try {
          body = BodySchema.parse(await request.json());
        } catch {
          return Response.json({ error: "Mensagem inválida." }, { status: 400 });
        }

        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) {
          return Response.json({ error: "Assistente indisponível no momento." }, { status: 500 });
        }

        const contextLine = body.productTitle
          ? `\nContexto do pedido: produto "${body.productTitle}" no valor de ${body.totalBrl ?? "valor do pedido"}.`
          : "";

        const input = body.messages.map((m) => ({
          role: m.role,
          content: [{ type: m.role === "user" ? "input_text" : "output_text", text: m.content }],
        }));

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "X-Lovable-AIG-SDK": "fetch",
          },
          body: JSON.stringify({
            model: "openai/gpt-6-astra",
            instructions: SYSTEM_PROMPT + contextLine,
            input,
            store: false,
            stream: true,
            reasoning: { effort: "low", summary: "auto" },
            include: ["reasoning.encrypted_content"],
          }),
        });

        if (!upstream.ok || !upstream.body) {
          const status = upstream.status;
          return Response.json(
            { error: status === 429 ? "Muitas mensagens seguidas. Aguarde um instante." : "O assistente não respondeu. Tente de novo." },
            { status: status === 429 ? 429 : 502 },
          );
        }

        // Consome o stream SSE e acumula o texto final.
        const reader = upstream.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let reply = "";

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split("\n\n");
          buffer = events.pop() ?? "";
          for (const evt of events) {
            const dataLine = evt.split("\n").find((l) => l.startsWith("data:"));
            if (!dataLine) continue;
            const raw = dataLine.slice(5).trim();
            if (!raw || raw === "[DONE]") continue;
            try {
              const parsed = JSON.parse(raw) as { type?: string; delta?: string };
              if (parsed.type === "response.output_text.delta" && typeof parsed.delta === "string") {
                reply += parsed.delta;
              }
            } catch {
              // frame parcial — ignora
            }
          }
        }

        if (!reply.trim()) {
          return Response.json({ error: "O assistente não respondeu. Tente de novo." }, { status: 502 });
        }
        return Response.json({ reply });
      },
    },
  },
});
