import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, BellRing } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { pushSupported, subscribeToPush } from "@/lib/push";
import { formatBRL } from "@/lib/store";

export function AdminNotifier() {
  const qc = useQueryClient();
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [supported, setSupported] = useState(true);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    setSupported(pushSupported());
    if (pushSupported()) {
      void navigator.serviceWorker.getRegistration("/sw.js").then(async (reg) => {
        const sub = await reg?.pushManager.getSubscription();
        setEnabled(Boolean(sub) && Notification.permission === "granted");
      });
    }
    const load = async () => {
      const { count } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "awaiting_confirmation");
      setPending(count ?? 0);
    };
    void load();
    const channel = supabase
      .channel("admin-orders")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, (payload) => {
        const row = payload.new as { status: string; total_cents: number; id: string };
        const old = payload.old as { status?: string };
        if (row.status === "awaiting_confirmation" && old.status !== "awaiting_confirmation") {
          toast.warning(`Novo Pix para aprovar: ${formatBRL(row.total_cents)}`, {
            description: `Pedido #${row.id.slice(0, 8).toUpperCase()}`,
            duration: 15000,
          });
        }
        void load();
        void qc.invalidateQueries({ queryKey: ["admin"] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc]);

  async function enable() {
    setBusy(true);
    try {
      const sub = await subscribeToPush();
      const { error } = await supabase.from("push_subscriptions").upsert(sub, { onConflict: "endpoint" });
      if (error) throw error;
      setEnabled(true);
      toast.success("Avisos ativados neste aparelho.");
    } catch {
      toast.error(
        "Não foi possível ativar. Permita as notificações. No iPhone, adicione o site à tela de início primeiro.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel flex flex-wrap items-center gap-3 p-4">
      <div className="relative">
        <Bell className="size-5 text-primary" />
        {pending > 0 ? (
          <span className="absolute -top-2 -right-2 grid size-5 place-items-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
            {pending}
          </span>
        ) : null}
      </div>
      <p className="flex-1 text-sm">
        {pending > 0 ? `${pending} Pix aguardando sua aprovação` : "Nenhum Pix aguardando aprovação"}
      </p>
      {supported ? (
        enabled ? (
          <span className="flex items-center gap-1 text-xs text-success">
            <BellRing className="size-4" /> Avisos ativos neste aparelho
          </span>
        ) : (
          <Button size="sm" onClick={enable} disabled={busy}>
            <BellRing className="size-4" /> Ativar avisos neste celular
          </Button>
        )
      ) : (
        <span className="text-xs text-muted-foreground">
          Este navegador não suporta avisos. No iPhone, adicione o site à tela de início.
        </span>
      )}
    </div>
  );
}
