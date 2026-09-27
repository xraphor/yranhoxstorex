import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, ShieldCheck, ShoppingCart, Tag } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { StoreShell } from "@/components/store/StoreShell";
import { ProductReviews } from "@/components/store/ProductReviews";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { discountPercent, formatBRL } from "@/lib/store";

export const Route = createFileRoute("/produto/$id")({
  head: () => ({
    meta: [
      { title: "Produto — yRanhox Store X" },
      {
        name: "description",
        content: "Detalhes do produto digital, garantia e compra instantânea via Pix.",
      },
      { property: "og:title", content: "Produto — yRanhox Store X" },
      {
        property: "og:description",
        content: "Compra instantânea via Pix com entrega automática.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProductPage,
});

function ProductPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { session, email } = useSession();
  const [buying, setBuying] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  async function buyNow() {
    if (!session || !email) {
      toast.info("Entre na sua conta para finalizar a compra.");
      navigate({ to: "/auth" });
      return;
    }
    if (!product) return;
    setBuying(true);
    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        user_id: session.user.id,
        buyer_email: email,
        total_cents: product.price_cents,
        status: "pending",
      })
      .select("id")
      .single();

    if (error || !order) {
      setBuying(false);
      toast.error("Não foi possível criar o pedido.");
      return;
    }

    const { error: itemError } = await supabase.from("order_items").insert({
      order_id: order.id,
      product_id: product.id,
      product_title: product.title,
      unit_price_cents: product.price_cents,
      quantity: 1,
    });
    setBuying(false);
    if (itemError) {
      toast.error("Não foi possível adicionar o produto ao pedido.");
      return;
    }

    navigate({ to: "/pedido/$id", params: { id: order.id } });
  }

  if (isLoading) {
    return (
      <StoreShell>
        <div className="mx-auto max-w-6xl px-4 py-10">
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </StoreShell>
    );
  }

  if (!product) {
    return (
      <StoreShell>
        <div className="mx-auto max-w-2xl px-4 py-24 text-center">
          <h1 className="font-display text-2xl">Produto não encontrado</h1>
        </div>
      </StoreShell>
    );
  }

  const gallery = [product.image_url, ...(product.images ?? [])].filter(Boolean) as string[];
  const off = discountPercent(product.price_cents, product.original_price_cents);
  const inStock = product.stock_count > 0;

  return (
    <StoreShell>
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="panel grid-lines aspect-[4/3] overflow-hidden">
            {gallery[activeImage] ? (
              <img
                src={gallery[activeImage]}
                alt={product.title}
                className="size-full object-cover"
              />
            ) : null}
          </div>
          {gallery.length > 1 ? (
            <div className="flex gap-2">
              {gallery.map((img, i) => (
                <button
                  key={img + i}
                  onClick={() => setActiveImage(i)}
                  className={`size-16 overflow-hidden rounded-lg border ${
                    i === activeImage ? "border-primary glow" : "border-border"
                  }`}
                >
                  <img src={img} alt="" className="size-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-primary/40 text-primary">
              {product.category}
            </Badge>
            <Badge variant="outline" className="text-muted-foreground">
              Vendido por {product.seller_name ?? "yRanhox Store X"}
            </Badge>
            <Badge
              variant="outline"
              className={
                inStock ? "border-success/40 text-success" : "border-destructive/40 text-destructive"
              }
            >
              {inStock ? `Em Estoque (${product.stock_count})` : "Esgotado"}
            </Badge>
            {off ? <Badge className="bg-destructive">-{off}% OFF</Badge> : null}
          </div>

          <h1 className="text-2xl font-bold sm:text-3xl">{product.title}</h1>

          <div className="flex items-end gap-3">
            <span className="font-display text-3xl font-black text-primary text-glow">
              {formatBRL(product.price_cents)}
            </span>
            {product.original_price_cents && product.original_price_cents > product.price_cents ? (
              <span className="text-muted-foreground line-through">
                {formatBRL(product.original_price_cents)}
              </span>
            ) : null}
          </div>

          <Button size="lg" className="w-full" disabled={!inStock || buying} onClick={buyNow}>
            {buying ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ShoppingCart className="size-4" />
            )}
            {inStock ? "Comprar Agora com Pix" : "Esgotado"}
          </Button>

          {product.tags?.length ? (
            <div className="flex flex-wrap items-center gap-2">
              <Tag className="size-4 text-muted-foreground" />
              {product.tags.map((t: string) => (
                <Badge key={t} variant="secondary">
                  {t}
                </Badge>
              ))}
            </div>
          ) : null}

          <div className="panel p-5">
            <h2 className="mb-2 font-display text-sm">Descrição</h2>
            <div
              className="prose-sm space-y-2 text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: product.description || "Sem descrição." }}
            />
          </div>

          {product.warranty ? (
            <div className="panel flex gap-3 p-5">
              <ShieldCheck className="size-5 shrink-0 text-success" />
              <div>
                <h2 className="font-display text-sm">Garantia</h2>
                <p className="mt-1 text-sm text-muted-foreground">{product.warranty}</p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
      <ProductReviews productId={product.id} />
    </StoreShell>
  );
}
