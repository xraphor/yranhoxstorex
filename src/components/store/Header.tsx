import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Menu, Package, Shield, User, Zap } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { AccentPicker } from "./AccentPicker";

const NAV = [
  { to: "/", label: "Loja" },
  { to: "/meus-pedidos", label: "Meus Pedidos" },
] as const;

export function Header({ notice }: { notice?: string | null }) {
  const { email, isAdmin } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-xl">
      {notice ? (
        <div className="bg-primary/12 border-b border-primary/25 px-4 py-1.5 text-center text-[11px] font-medium tracking-wide text-primary">
          {notice}
        </div>
      ) : null}
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-lg border border-primary/40 bg-primary/15 glow">
            <Zap className="size-5 text-primary" />
          </span>
          <span className="font-display text-sm leading-tight font-bold sm:text-base">
            yRanhox <span className="text-primary text-glow">Store X</span>
          </span>
        </Link>

        <nav className="ml-6 hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
              activeProps={{ className: "text-primary" }}
            >
              {item.label}
            </Link>
          ))}
          {isAdmin ? (
            <Link
              to="/admin"
              className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
              activeProps={{ className: "text-primary" }}
            >
              <Shield className="size-4" /> Admin
            </Link>
          ) : null}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <AccentPicker />
          {email ? (
            <>
              <span className="hidden max-w-[180px] truncate text-xs text-muted-foreground lg:block">
                {email}
              </span>
              <Button variant="outline" size="sm" onClick={signOut} className="hidden sm:flex">
                <LogOut className="size-4" /> Sair
              </Button>
            </>
          ) : (
            <Button asChild size="sm" className="hidden sm:flex">
              <Link to="/auth">Entrar</Link>
            </Button>
          )}

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden" aria-label="Menu">
                <Menu className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 bg-surface">
              <div className="mt-8 flex flex-col gap-1">
                <Link
                  to="/"
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-2.5 text-sm hover:bg-surface-2"
                >
                  Loja
                </Link>
                <Link
                  to="/meus-pedidos"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm hover:bg-surface-2"
                >
                  <Package className="size-4" /> Meus Pedidos
                </Link>
                {isAdmin ? (
                  <Link
                    to="/admin"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm hover:bg-surface-2"
                  >
                    <Shield className="size-4" /> Painel Admin
                  </Link>
                ) : null}
                <div className="my-3 h-px bg-border" />
                {email ? (
                  <Button variant="outline" onClick={signOut}>
                    <LogOut className="size-4" /> Sair
                  </Button>
                ) : (
                  <Button asChild onClick={() => setOpen(false)}>
                    <Link to="/auth">
                      <User className="size-4" /> Entrar / Cadastrar
                    </Link>
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
