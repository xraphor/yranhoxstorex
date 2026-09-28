import { Link } from "@tanstack/react-router";
import { ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { discountPercent, formatBRL } from "@/lib/store";

export type ProductRow = {
  id: string;
  title: string;
  category: string;
  price_cents: number;
  original_price_cents: number | null;
  image_url: string | null;
  stock_count: number;
  featured: boolean;
};

export function ProductCard({ product }: { product: ProductRow }) {
  const off = discountPercent(product.price_cents, product.original_price_cents);
  const inStock = product.stock_count > 0;

  return (
    <article className="group flex min-w-0 flex-col overflow-hidden rounded-md border border-border/70 bg-card shadow-sm transition-colors hover:border-primary/50">
      <Link to="/produto/$id" params={{ id: product.id }} className="relative block p-1 sm:p-1.5">
        <div className="grid-lines aspect-square w-full overflow-hidden rounded-md bg-surface-2">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.title}
              loading="lazy"
              className="size-full object-contain transition-transform duration-300 group-hover:scale-105"
            />
          ) : null}
        </div>
        <div className="absolute top-2 left-2 max-w-[calc(100%-1rem)] sm:top-2.5 sm:left-2.5">
          <Badge variant="outline" className="h-4 max-w-full truncate rounded-sm border-primary/40 bg-background/85 px-1 text-[7px] leading-none text-primary sm:h-5 sm:px-1.5 sm:text-[9px]">
            {product.category}
          </Badge>
        </div>
        {off ? (
          <Badge className="absolute right-2 bottom-2 h-4 rounded-sm bg-destructive px-1 text-[7px] leading-none text-destructive-foreground sm:right-2.5 sm:bottom-2.5 sm:h-5 sm:px-1.5 sm:text-[9px]">
            -{off}%
          </Badge>
        ) : null}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-1 p-1 pt-0 sm:gap-2 sm:p-1.5 sm:pt-0">
        <Link to="/produto/$id" params={{ id: product.id }} className="min-w-0">
          <h3 className="truncate text-[10px] font-semibold leading-tight transition-colors group-hover:text-primary sm:text-xs">
            {product.title}
          </h3>
        </Link>
        <div className="mt-auto flex min-w-0 items-center justify-between gap-1">
          <span className="truncate text-[11px] font-bold text-primary sm:text-sm">
            {formatBRL(product.price_cents)}
          </span>
          {product.original_price_cents && product.original_price_cents > product.price_cents ? (
            <span className="hidden truncate text-[9px] text-muted-foreground line-through sm:block">
              {formatBRL(product.original_price_cents)}
            </span>
          ) : null}
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1">
          <span className={`truncate text-[7px] font-medium sm:text-[9px] ${inStock ? "text-success" : "text-destructive"}`}>
            {inStock ? "Em estoque" : "Esgotado"}
          </span>
          <Button asChild={inStock} disabled={!inStock} size="icon" className="size-6 shrink-0 rounded-sm sm:size-7">
            {inStock ? (
              <Link to="/produto/$id" params={{ id: product.id }} aria-label={`Comprar ${product.title}`} title="Comprar agora">
                <ShoppingCart className="size-3 sm:size-3.5" />
              </Link>
            ) : (
              <span aria-label="Produto esgotado">
                <ShoppingCart className="size-3 sm:size-3.5" />
              </span>
            )}
          </Button>
        </div>
      </div>
    </article>
  );
}
