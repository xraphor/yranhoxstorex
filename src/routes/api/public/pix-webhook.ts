import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const payloadSchema = z.object({
  order_id: z.string().uuid(),
  status: z.string().min(1),
});

/**
 * Webhook de confirmação de pagamento Pix.
 * Configure no gateway (Mercado Pago / Asaas / Efi) com o header
 * `x-pix-secret: <PIX_WEBHOOK_SECRET>` e corpo { order_id, status }.
 * Quando o status indicar pagamento aprovado, o estoque digital é
 * reservado e entregue automaticamente ao comprador.
 */
export const Route = createFileRoute("/api/public/pix-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["PIX_WEBHOOK_SECRET"];
        if (!secret || request.headers.get("x-pix-secret") !== secret) {
          return new Response("Unauthorized", { status: 401 });
        }

        const parsed = payloadSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) {
          return Response.json({ error: "Invalid payload" }, { status: 400 });
        }

        const approved = ["paid", "approved", "received", "CONFIRMED", "RECEIVED"].includes(
          parsed.data.status,
        );
        if (!approved) return Response.json({ ok: true, ignored: true });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin.rpc("approve_order", {
          p_order_id: parsed.data.order_id,
        });
        if (error) {
          console.error("approve_order failed", error.message);
          return Response.json({ error: "Delivery failed" }, { status: 500 });
        }

        return Response.json({ ok: true });
      },
    },
  },
});
