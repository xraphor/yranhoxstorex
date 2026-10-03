import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const gatewaySchema = z.object({
  order_id: z.string().uuid(),
  status: z.string().min(1),
});

/** Extrai o valor em centavos de um texto de notificação do Nubank. */
function extractCents(text: string): number | null {
  const m = text.match(/R\$\s*([\d.]+,\d{2})/i) ?? text.match(/R\$\s*(\d+(?:\.\d{2})?)/i);
  if (!m) return null;
  const raw = m[1] ?? "";
  const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  const value = Math.round(parseFloat(normalized) * 100);
  return Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * Webhook de pagamento Pix.
 * 1) MacroDroid (Nubank): body { secret, notification } — lê o valor e aprova
 *    o pedido em aberto mais recente com o valor exato.
 * 2) Gateway: header x-pix-secret + body { order_id, status }.
 */
export const Route = createFileRoute("/api/public/pix-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = (await request.text()).slice(0, 5000);
        let body: Record<string, unknown> = {};
        try {
          body = JSON.parse(raw);
        } catch {
          try {
            body = Object.fromEntries(new URLSearchParams(raw));
          } catch {
            body = {};
          }
        }

        const expected = process.env["PIX_WEBHOOK_SECRET"] || "1702";
        const provided =
          request.headers.get("x-pix-secret") ??
          (typeof body["secret"] === "string" ? body["secret"] : null) ??
          raw.match(/"secret"\s*:\s*"([^"]+)"/)?.[1] ??
          null;
        if (provided !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Gateway format
        const gw = gatewaySchema.safeParse(body);
        if (gw.success) {
          const ok = ["paid", "approved", "received", "CONFIRMED", "RECEIVED"].includes(gw.data.status);
          if (!ok) return Response.json({ ok: true, ignored: true });
          const { error } = await supabaseAdmin.rpc("approve_order", { p_order_id: gw.data.order_id });
          if (error) return Response.json({ error: "Delivery failed" }, { status: 500 });
          return Response.json({ ok: true });
        }

        // MacroDroid / Nubank format
        const text = typeof body["notification"] === "string" ? body["notification"] : raw;
        if (!/pix|transfer|recebeu/i.test(text)) {
          return Response.json({ ok: true, ignored: "not a pix notification" });
        }
        const cents = extractCents(text);
        if (!cents) return Response.json({ ok: true, ignored: "amount not found" });

        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: orders, error: findErr } = await supabaseAdmin
          .from("orders")
          .select("id,status,created_at")
          .eq("total_cents", cents)
          .in("status", ["awaiting_confirmation", "pending"])
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(10);
        if (findErr) return Response.json({ error: "Lookup failed" }, { status: 500 });

        const match =
          orders?.find((o) => o.status === "awaiting_confirmation") ?? orders?.[0];
        if (!match) return Response.json({ ok: true, matched: false, amount_cents: cents });

        const { error } = await supabaseAdmin.rpc("approve_order", { p_order_id: match.id });
        if (error) {
          console.error("approve_order failed", error.message);
          return Response.json({ error: "Delivery failed" }, { status: 500 });
        }
        return Response.json({ ok: true, matched: true, amount_cents: cents });
      },
    },
  },
});
