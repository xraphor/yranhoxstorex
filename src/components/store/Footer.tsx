import { Zap } from "lucide-react";

export function Footer({ support }: { support?: string | null }) {
  return (
    <footer className="mt-20 border-t border-border/70 bg-surface/40">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Zap className="size-4 text-primary" />
          <span className="font-display text-foreground">yRanhox Store X</span>
        </div>
        <p>Entrega automática de produtos digitais via Pix.</p>
        {support ? (
          <a
            href={support}
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
          >
            Suporte
          </a>
        ) : null}
      </div>
    </footer>
  );
}
