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
    <article className="panel glow-hover group flex flex-col overflow-hidden">
      <Link to="/produto/$id" params={{ id: product.id }} className="relative block">
        <div className="grid-lines aspect-[4/3] w-full overflow-hidden bg-surface-2">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.title}
              loading="lazy"
              className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : null}
        </div>
        <div className="absolute top-3 left-3 flex gap-1.5">
          <Badge variant="outline" className="border-primary/40 bg-background/80 text-primary">
            {product.category}
          </Badge>
          {off ? <Badge className="bg-destructive text-destructive-foreground">-{off}%</Badge> : null}
        </div>
        <Badge
          variant="outline"
          className={`absolute top-3 right-3 ${
            inStock
              ? "border-success/40 bg-background/80 text-success"
              : "border-destructive/40 bg-background/80 text-destructive"
          }`}
        >
          {inStock ? "Em Estoque" : "Esgotado"}
        </Badge>
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <Link to="/produto/$id" params={{ id: product.id }}>
          <h3 className="line-clamp-2 text-sm font-semibold transition-colors group-hover:text-primary">
            {product.title}
          </h3>
        </Link>
        <div className="mt-auto flex items-end gap-2">
          <span className="font-display text-lg font-bold text-primary">
            {formatBRL(product.price_cents)}
          </span>
          {product.original_price_cents && product.original_price_cents > product.price_cents ? (
            <span className="text-xs text-muted-foreground line-through">
              {formatBRL(product.original_price_cents)}
            </span>
          ) : null}
        </div>
        <Button asChild disabled={!inStock} className="w-full">
          <Link to="/produto/$id" params={{ id: product.id }}>
            <ShoppingCart className="size-4" />
            {inStock ? "Comprar Agora" : "Esgotado"}
          </Link>
        </Button>
      </div>
    </article>
  );
}
