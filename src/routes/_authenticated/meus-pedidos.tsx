import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Copy, Package } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { StoreShell } from "@/components/store/StoreShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBRL, ORDER_STATUS } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/meus-pedidos")({
  head: () => ({
    meta: [
      { title: "Meus pedidos — yRanhox Store X" },
      {
        name: "description",
        content: "Histórico de compras e produtos digitais entregues na yRanhox Store X.",
      },
      { property: "og:title", content: "Meus pedidos — yRanhox Store X" },
      { property: "og:description", content: "Acesse e copie seus produtos digitais." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MyOrders,
});

function MyOrders() {
  const { data, isLoading } = useQuery({
    queryKey: ["my-orders"],
    queryFn: async () => {
      const { data: orders, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return orders;
    },
  });

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    toast.success("Conteúdo copiado!");
  }

  return (
    <StoreShell>
      <div className="mx-auto max-w-4xl space-y-5 px-4 py-10">
        <h1 className="font-display text-xl">Meus pedidos</h1>

        {isLoading ? (
          <Skeleton className="h-40 rounded-xl" />
        ) : !data?.length ? (
          <div className="panel flex flex-col items-center gap-3 p-14 text-center">
            <Package className="size-6 text-primary" />
            <p className="font-display">Você ainda não fez pedidos</p>
            <Button asChild>
              <Link to="/">Explorar a loja</Link>
            </Button>
          </div>
        ) : (
          data.map((order) => {
            const status = ORDER_STATUS[order.status] ?? ORDER_STATUS["pending"]!;
            return (
              <div key={order.id} className="panel space-y-3 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-display text-sm">#{order.id.slice(0, 8).toUpperCase()}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleString("pt-BR")} ·{" "}
                      {formatBRL(order.total_cents)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={status.className}>
                      {status.label}
                    </Badge>
                    <Button asChild size="sm" variant="outline">
                      <Link to="/pedido/$id" params={{ id: order.id }}>
                        Abrir
                      </Link>
                    </Button>
                  </div>
                </div>

                {order.order_items?.map((item) => (
                  <div key={item.id} className="rounded-lg border border-border bg-surface-2/50 p-3">
                    <p className="text-sm font-medium">{item.product_title}</p>
                    {item.delivered_content ? (
                      <>
                        <pre className="mt-2 overflow-x-auto rounded bg-background/70 p-2 text-xs whitespace-pre-wrap">
                          {item.delivered_content}
                        </pre>
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2"
                          onClick={() => copy(item.delivered_content!)}
                        >
                          <Copy className="size-4" /> Copiar Chave/Login
                        </Button>
                      </>
                    ) : (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Conteúdo liberado após a confirmação do pagamento.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            );
          })
        )}
      </div>
    </StoreShell>
  );
}
