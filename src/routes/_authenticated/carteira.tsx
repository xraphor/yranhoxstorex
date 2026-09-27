import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { StoreShell } from "@/components/store/StoreShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatBRL } from "@/lib/store";
import { notifyAdmin } from "@/lib/notify.functions";

export const Route = createFileRoute("/_authenticated/carteira")({
  head: () => ({
    meta: [
      { title: "Carteira · yRanhox Store X" },
      { name: "description", content: "Saldo, vendas e saques da sua carteira na yRanhox Store X." },
      { property: "og:title", content: "Carteira · yRanhox Store X" },
      { property: "og:description", content: "Saldo, vendas e saques da sua carteira." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WalletPage,
});

function WalletPage() {
  const { isAdmin } = useSession();
  const qc = useQueryClient();
  const owner = isAdmin ? "store" : "seller";
  const [amount, setAmount] = useState("");
  const [pix, setPix] = useState("");

  const { data: bal } = useQuery({
    queryKey: ["wallet", owner],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("wallet_balance", { p_owner: owner });
      if (error) throw error;
      return data?.[0] ?? { pending_cents: 0, available_cents: 0 };
    },
  });
  const { data: entries } = useQuery({
    queryKey: ["wallet", "entries", owner],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wallet_entries")
        .select("*")
        .eq("owner_type", owner)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: withdrawals } = useQuery({
    queryKey: ["wallet", "withdrawals", owner],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("withdrawals")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const withdraw = useMutation({
    mutationFn: async () => {
      const cents = Math.round(Number(amount.replace(",", ".")) * 100);
      const { data, error } = await supabase.rpc("request_withdrawal", { p_amount_cents: cents, p_pix_key: pix });
      if (error) throw error;
      if (!isAdmin && data) void notifyAdmin({ data: { kind: "withdrawal", refId: data } }).catch(() => undefined);
    },
    onSuccess: () => {
      toast.success(isAdmin ? "Saque registrado." : "Saque solicitado! Você recebe no Pix após a aprovação.");
      setAmount("");
      void qc.invalidateQueries({ queryKey: ["wallet"] });
    },
    onError: (e) => toast.error(e.message.includes("saldo") ? "Saldo insuficiente." : "Não foi possível sacar."),
  });

  const process = useMutation({
    mutationFn: async ({ id, paid }: { id: string; paid: boolean }) => {
      const { error } = await supabase.rpc("process_withdrawal", { p_id: id, p_paid: paid });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Saque atualizado.");
      void qc.invalidateQueries({ queryKey: ["wallet"] });
    },
  });

  const pendingSellerWithdrawals = (withdrawals ?? []).filter((w) => w.owner_type === "seller" && w.status === "pending");

  return (
    <StoreShell>
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-10">
        <h1 className="font-display text-xl">{isAdmin ? "Carteira da loja" : "Minha carteira"}</h1>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="panel p-5">
            <p className="text-xs text-muted-foreground">Disponível para saque</p>
            <p className="font-display text-2xl text-success">{formatBRL(Number(bal?.available_cents ?? 0))}</p>
          </div>
          <div className="panel p-5">
            <p className="text-xs text-muted-foreground">Em garantia (libera em 3 dias)</p>
            <p className="font-display text-2xl text-warning">{formatBRL(Number(bal?.pending_cents ?? 0))}</p>
          </div>
        </div>

        <div className="panel space-y-3 p-5">
          <p className="text-sm font-semibold">{isAdmin ? "Sacar da loja" : "Solicitar saque"}</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input placeholder="Valor (ex: 25,00)" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <Input placeholder="Sua chave Pix" value={pix} onChange={(e) => setPix(e.target.value)} />
            <Button disabled={!amount || !pix || withdraw.isPending} onClick={() => withdraw.mutate()}>
              Sacar
            </Button>
          </div>
        </div>

        {isAdmin ? (
          <div className="panel space-y-3 p-5">
            <p className="text-sm font-semibold">Saques de vendedores para pagar</p>
            {pendingSellerWithdrawals.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum saque pendente.</p>
            ) : (
              pendingSellerWithdrawals.map((w) => (
                <div key={w.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-3 text-sm">
                  <span className="flex-1">
                    {w.seller_name} · {formatBRL(w.amount_cents)} · Pix: {w.pix_key}
                  </span>
                  <Button size="sm" onClick={() => process.mutate({ id: w.id, paid: true })}>Paguei</Button>
                  <Button size="sm" variant="outline" onClick={() => process.mutate({ id: w.id, paid: false })}>
                    Recusar
                  </Button>
                </div>
              ))
            )}
          </div>
        ) : null}

        <div className="panel space-y-2 p-5">
          <p className="text-sm font-semibold">Histórico</p>
          {(entries ?? []).map((e) => (
            <div key={e.id} className="flex justify-between border-b border-border/50 py-2 text-sm">
              <span>
                {e.description}
                {e.amount_cents > 0 && new Date(e.release_at) > new Date() ? (
                  <span className="ml-2 text-xs text-warning">
                    libera {new Date(e.release_at).toLocaleDateString("pt-BR")}
                  </span>
                ) : null}
              </span>
              <span className={e.amount_cents < 0 ? "text-destructive" : "text-success"}>
                {formatBRL(e.amount_cents)}
              </span>
            </div>
          ))}
          {!entries?.length ? <p className="text-xs text-muted-foreground">Nenhuma movimentação ainda.</p> : null}
        </div>
      </div>
    </StoreShell>
  );
}
