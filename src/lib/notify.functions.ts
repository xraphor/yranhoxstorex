import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const schema = z.object({
  kind: z.enum(["pix", "seller", "withdrawal"]),
  refId: z.string().uuid().optional(),
});

function brl(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export const notifyAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let title = "";
    let body = "";
    let url = "/admin";

    // Verify the event is real, using the caller's own permissions.
    if (data.kind === "pix") {
      if (!data.refId) return { sent: 0 };
      const { data: order } = await supabase
        .from("orders")
        .select("id,total_cents,status,user_id")
        .eq("id", data.refId)
        .maybeSingle();
      if (!order || order.user_id !== userId || order.status !== "awaiting_confirmation") return { sent: 0 };
      title = "Novo Pix para aprovar";
      body = `${brl(order.total_cents)} · pedido #${order.id.slice(0, 8).toUpperCase()}`;
      url = "/admin?tab=orders";
    } else if (data.kind === "seller") {
      const { data: seller } = await supabase
        .from("seller_profiles")
        .select("display_name")
        .eq("user_id", userId)
        .maybeSingle();
      if (!seller) return { sent: 0 };
      title = "Novo vendedor";
      body = `${seller.display_name} começou a vender na loja.`;
      url = "/admin?tab=products";
    } else {
      if (!data.refId) return { sent: 0 };
      const { data: w } = await supabase
        .from("withdrawals")
        .select("amount_cents,status,user_id,seller_name")
        .eq("id", data.refId)
        .maybeSingle();
      if (!w || w.user_id !== userId || w.status !== "pending") return { sent: 0 };
      title = "Pedido de saque";
      body = `${w.seller_name ?? "Vendedor"} pediu ${brl(w.amount_cents)}.`;
      url = "/carteira";
    }

    const privateKey = process.env["VAPID_PRIVATE_KEY"];
    if (!privateKey) return { sent: 0 };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { buildPushPayload } = await import("@block65/webcrypto-web-push");
    const { VAPID_PUBLIC_KEY } = await import("@/lib/push");

    const { data: admins } = await supabaseAdmin.from("profiles").select("id").eq("role", "admin");
    const ids = (admins ?? []).map((a) => a.id);
    if (!ids.length) return { sent: 0 };
    const { data: subs } = await supabaseAdmin.from("push_subscriptions").select("*").in("user_id", ids);

    let sent = 0;
    for (const s of subs ?? []) {
      try {
        const payload = await buildPushPayload(
          { data: { title, body, url }, options: { ttl: 86400, urgency: "high" } },
          { endpoint: s.endpoint, expirationTime: null, keys: { p256dh: s.p256dh, auth: s.auth } },
          { subject: "mailto:raphael900001@gmail.com", publicKey: VAPID_PUBLIC_KEY, privateKey },
        );
        const res = await fetch(s.endpoint, payload);
        if (res.status === 404 || res.status === 410) {
          await supabaseAdmin.from("push_subscriptions").delete().eq("id", s.id);
        } else if (res.ok) sent++;
        else console.error("push failed", res.status, await res.text());
      } catch (e) {
        console.error("push error", e);
      }
    }
    return { sent };
  });
