import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import QRCode from "qrcode";
import { CheckCircle2, Clock, Copy, Loader2, QrCode } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { StoreShell, useStoreSettings } from "@/components/store/StoreShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBRL, ORDER_STATUS } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/pedido/$id")({
  head: () => ({
    meta: [
      { title: "Pagamento Pix — yRanhox Store X" },
      { name: "description", content: "Pague via Pix e receba seu produto digital na hora." },
      { property: "og:title", content: "Pagamento Pix — yRanhox Store X" },
      { property: "og:description", content: "Checkout Pix com entrega automática." },
    ],
  }),
  component: OrderPage,
});

function useCountdown(expiresAt?: string | null) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (!expiresAt) return;
    const tick = () =>
      setLeft(Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [expiresAt]);
  const m = Math.floor(left / 60);
  const s = left % 60;
  return { left, label: `${m}:${String(s).padStart(2, "0")}` };
}

function OrderPage() {
  const { id } = Route.useParams();
  const { data: settings } = useStoreSettings();
  const [qr, setQr] = useState<string | null>(null);
  const celebrated = useRef(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["order", id],
    refetchInterval: (query) => (query.state.data?.order?.status === "paid" ? false : 5000),
    queryFn: async () => {
      const [{ data: order, error }, { data: items, error: itemsError }] = await Promise.all([
        supabase.from("orders").select("*").eq("id", id).maybeSingle(),
        supabase.from("order_items").select("*").eq("order_id", id),
      ]);
      if (error) throw error;
      if (itemsError) throw itemsError;
      return { order, items: items ?? [] };
    },
  });

  const order = data?.order;
  const payload = order?.pix_payload ?? settings?.pix_payload ?? "";
  const { left, label } = useCountdown(order?.expires_at);

  useEffect(() => {
    if (!payload) return;
    void QRCode.toDataURL(payload, { width: 320, margin: 1 }).then(setQr);
  }, [payload]);

  useEffect(() => {
    if (order?.status === "paid" && !celebrated.current) {
      celebrated.current = true;
      void confetti({ particleCount: 140, spread: 80, origin: { y: 0.3 } });
      toast.success("Pagamento aprovado! Produto liberado.");
    }
  }, [order?.status]);

  async function copy(text: string, message: string) {
    await navigator.clipboard.writeText(text);
    toast.success(message);
  }

  async function markPaid() {
    const { error } = await supabase
      .from("orders")
      .update({ status: "awaiting_confirmation" })
      .eq("id", id);
    if (error) {
      toast.error("Não foi possível confirmar o envio do Pix.");
      return;
    }
    toast.success("Recebemos seu aviso! A liberação ocorre após a confirmação do Pix.");
    void refetch();
  }

  if (isLoading) {
    return (
      <StoreShell>
        <div className="mx-auto max-w-3xl px-4 py-10">
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </StoreShell>
    );
  }

  if (!order) {
    return (
      <StoreShell>
        <div className="mx-auto max-w-2xl px-4 py-24 text-center">
          <h1 className="font-display text-2xl">Pedido não encontrado</h1>
        </div>
      </StoreShell>
    );
  }

  const status = ORDER_STATUS[order.status] ?? ORDER_STATUS["pending"]!;
  const paid = order.status === "paid";

  return (
    <StoreShell>
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-xl">Pedido #{order.id.slice(0, 8).toUpperCase()}</h1>
            <p className="text-sm text-muted-foreground">
              Total: {formatBRL(order.total_cents)} · {order.buyer_email}
            </p>
          </div>
          <Badge variant="outline" className={status.className}>
            {status.label}
          </Badge>
        </div>

        {paid ? (
          <div className="panel space-y-4 p-6">
            <div className="flex items-center gap-2 text-success">
              <CheckCircle2 className="size-5" />
              <h2 className="font-display text-sm">Produto entregue</h2>
            </div>
            {data?.items.map((item) => (
              <div key={item.id} className="rounded-lg border border-border bg-surface-2/60 p-4">
                <p className="text-sm font-semibold">{item.product_title}</p>
                <pre className="mt-2 overflow-x-auto rounded-md bg-background/70 p-3 text-xs whitespace-pre-wrap">
                  {item.delivered_content ?? "Conteúdo em processamento..."}
                </pre>
                {item.delivered_content ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3"
                    onClick={() => copy(item.delivered_content!, "Conteúdo copiado!")}
                  >
                    <Copy className="size-4" /> Copiar Chave/Login
                  </Button>
                ) : null}
              </div>
            ))}
            <Button asChild variant="outline">
              <Link to="/meus-pedidos">Ver meus pedidos</Link>
            </Button>
          </div>
        ) : (
          <div className="panel space-y-5 p-6">
            <div className="flex items-center gap-2">
              <QrCode className="size-5 text-primary" />
              <h2 className="font-display text-sm">Pague com Pix para liberar o produto</h2>
            </div>

            <div className="flex flex-col items-center gap-4">
              {qr ? (
                <img
                  src={qr}
                  alt="QR Code Pix"
                  className="w-56 rounded-xl border border-primary/30 bg-white p-2 glow"
                />
              ) : (
                <Loader2 className="size-6 animate-spin text-primary" />
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="size-4" />
                {left > 0 ? (
                  <span>
                    Expira em <span className="font-display text-primary">{label}</span>
                  </span>
                ) : (
                  <span className="text-destructive">Tempo expirado — gere um novo pedido</span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Pix Copia e Cola</p>
              <div className="flex gap-2">
                <code className="flex-1 overflow-hidden rounded-md border border-border bg-surface-2/70 p-3 text-[11px] break-all">
                  {payload || "Chave Pix não configurada"}
                </code>
              </div>
              <Button
                variant="outline"
                className="w-full"
                disabled={!payload}
                onClick={() => copy(payload, "Código Pix copiado!")}
              >
                <Copy className="size-4" /> Copiar código Pix
              </Button>
            </div>

            <Button
              className="w-full"
              disabled={order.status === "awaiting_confirmation"}
              onClick={markPaid}
            >
              {order.status === "awaiting_confirmation" ? "Aguardando confirmação" : "Já efetuei o Pix"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Assim que o pagamento é confirmado, seu produto aparece aqui automaticamente.
            </p>
          </div>
        )}
      </div>
    </StoreShell>
  );
}
