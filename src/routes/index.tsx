import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Sparkles, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StoreShell, useStoreSettings } from "@/components/store/StoreShell";
import { ProductCard, type ProductRow } from "@/components/store/ProductCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCategories } from "@/hooks/useCategories";
import heroImage from "@/assets/hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "yRanhox Store X — Produtos digitais com entrega automática" },
      {
        name: "description",
        content:
          "Compre contas, keys de ativação, itens de jogos, scripts e licenças com entrega automática via Pix na yRanhox Store X.",
      },
      { property: "og:title", content: "yRanhox Store X — Produtos digitais via Pix" },
      {
        property: "og:description",
        content: "Contas, keys, scripts e métodos entregues na hora após o pagamento via Pix.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const { data: settings } = useStoreSettings();
  const { data: categories } = useCategories();

  const { data: products, isLoading } = useQuery({
    queryKey: ["products", "catalog"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id,title,category,price_cents,original_price_cents,image_url,stock_count,featured")
        .eq("active", true)
        .order("featured", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ProductRow[];
    },
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (products ?? []).filter(
      (p) =>
        (!category || p.category === category) && (!term || p.title.toLowerCase().includes(term)),
    );
  }, [products, search, category]);

  return (
    <StoreShell>
      <section className="relative overflow-hidden border-b border-border/70">
        <img
          src={heroImage}
          alt=""
          width={1920}
          height={800}
          className="absolute inset-0 size-full object-cover opacity-45"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/30" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:py-24">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="size-3.5" /> Entrega automática após o Pix
          </span>
          <h1 className="mt-5 max-w-2xl text-3xl leading-tight font-black sm:text-5xl">
            {settings?.banner_title ?? "yRanhox Store X"}
          </h1>
          <p className="mt-4 max-w-xl text-sm text-muted-foreground sm:text-base">
            {settings?.banner_subtitle ??
              "Contas, keys, scripts e métodos com entrega automática via Pix."}
          </p>
          <div className="mt-7 flex max-w-md items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar produto..."
                className="bg-surface/80 pl-9"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-6 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={category === null ? "default" : "outline"}
            onClick={() => setCategory(null)}
          >
            Todos
          </Button>
          {(categories ?? []).map(({ name: c }) => (
            <Button
              key={c}
              size="sm"
              variant={category === c ? "default" : "outline"}
              onClick={() => setCategory(c)}
            >
              {c}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-80 rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="panel flex flex-col items-center gap-2 p-14 text-center">
            <Zap className="size-6 text-primary" />
            <p className="font-display">Nenhum produto encontrado</p>
            <p className="text-sm text-muted-foreground">
              Tente outra busca ou volte mais tarde para novos lançamentos.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </StoreShell>
  );
}
