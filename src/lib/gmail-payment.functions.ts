import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inputSchema = z.object({ orderId: z.string().uuid() });
const GMAIL_URL = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";
const NUBANK_SUBJECT = "Você recebeu uma transferência";

type GmailHeader = { name?: string; value?: string };
type GmailPart = {
  mimeType?: string;
  body?: { data?: string };
  parts?: GmailPart[];
  headers?: GmailHeader[];
};
type GmailMessage = {
  id?: string;
  internalDate?: string;
  payload?: GmailPart;
};

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64").toString("utf8");
}

function collectBodies(part?: GmailPart): string[] {
  if (!part) return [];
  const own = part.body?.data ? [decodeBase64Url(part.body.data)] : [];
  return [...own, ...(part.parts ?? []).flatMap(collectBodies)];
}

function header(part: GmailPart | undefined, name: string) {
  return part?.headers?.find((item) => item.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
}

function extractAmountCents(message: GmailMessage) {
  const source = collectBodies(message.payload).join(" ");
  const plain = source
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ");
  const match = plain.match(/Valor recebido:\s*R\$\s*([\d.]+,\d{2})/i);
  if (!match?.[1]) return null;
  const value = Number(match[1].replace(/\./g, "").replace(",", "."));
  return Number.isFinite(value) && value > 0 ? Math.round(value * 100) : null;
}

async function gmailFetch(path: string) {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const gmailKey = process.env["GOOGLE_MAIL_API_KEY"];
  if (!lovableKey || !gmailKey) throw new Error("Gmail não está conectado à loja.");

  const response = await fetch(`${GMAIL_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": gmailKey,
    },
  });
  if (!response.ok) {
    const detail = await response.text();
    console.error(`Gmail request failed [${response.status}]: ${detail}`);
    throw new Error(`Não foi possível consultar o Gmail [${response.status}].`);
  }
  return response.json() as Promise<Record<string, unknown>>;
}

export const checkGmailPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => inputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: order, error: orderError } = await context.supabase
      .from("orders")
      .select("id,user_id,total_cents,status,created_at")
      .eq("id", data.orderId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (orderError) throw orderError;
    if (!order || order.status === "paid") return { paid: order?.status === "paid" };
    if (order.status !== "awaiting_confirmation") return { paid: false };

    const query = encodeURIComponent(
      `from:nubank.com.br subject:"${NUBANK_SUBJECT}" newer_than:2d`,
    );
    const list = await gmailFetch(`/users/me/messages?maxResults=20&q=${query}`);
    const ids = Array.isArray(list["messages"])
      ? list["messages"]
          .map((item) => (typeof item === "object" && item ? (item as { id?: unknown }).id : null))
          .filter((id): id is string => typeof id === "string")
      : [];
    if (!ids.length) return { paid: false };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: used } = await supabaseAdmin
      .from("payment_email_receipts")
      .select("gmail_message_id")
      .in("gmail_message_id", ids);
    const usedIds = new Set((used ?? []).map((item) => item.gmail_message_id));
    const createdAt = new Date(order.created_at).getTime();

    for (const messageId of ids) {
      if (usedIds.has(messageId)) continue;
      const message = (await gmailFetch(
        `/users/me/messages/${encodeURIComponent(messageId)}?format=full`,
      )) as GmailMessage;
      const receivedAt = Number(message.internalDate ?? 0);
      const from = header(message.payload, "From");
      const subject = header(message.payload, "Subject");
      if (
        !receivedAt ||
        receivedAt < createdAt ||
        !/@nubank\.com\.br\b/i.test(from) ||
        subject.trim() !== NUBANK_SUBJECT ||
        extractAmountCents(message) !== order.total_cents
      ) {
        continue;
      }

      const { data: queue } = await supabaseAdmin
        .from("orders")
        .select("id")
        .eq("total_cents", order.total_cents)
        .eq("status", "awaiting_confirmation")
        .lte("created_at", new Date(receivedAt).toISOString())
        .order("created_at", { ascending: true })
        .limit(1);
      if (queue?.[0]?.id !== order.id) return { paid: false };

      const { error: receiptError } = await supabaseAdmin.from("payment_email_receipts").insert({
        gmail_message_id: messageId,
        amount_cents: order.total_cents,
        sender: from,
        received_at: new Date(receivedAt).toISOString(),
        order_id: order.id,
      });
      if (receiptError) {
        if (receiptError.code === "23505") continue;
        throw receiptError;
      }

      const { error: approvalError } = await supabaseAdmin.rpc("approve_order", {
        p_order_id: order.id,
      });
      if (approvalError) throw approvalError;
      return { paid: true };
    }

    return { paid: false };
  });