import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { useCategories } from "@/hooks/useCategories";
import { StoreShell } from "@/components/store/StoreShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatBRL } from "@/lib/store";
import { notifyAdmin } from "@/lib/notify.functions";

export const Route = createFileRoute("/_authenticated/vender")({
  head: () => ({
    meta: [
      { title: "Vender · yRanhox Store X" },
      { name: "description", content: "Anuncie seus produtos digitais na yRanhox Store X e receba 80% de cada venda." },
      { property: "og:title", content: "Vender · yRanhox Store X" },
      { property: "og:description", content: "Anuncie e receba 80% de cada venda." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SellPage,
});

function splitStock(v: string) {
  return v.split(/^\s*--\s*$/m).map((s) => s.trim()).filter(Boolean);
}

function SellPage() {
  const { user } = useSession();
  const qc = useQueryClient();
  const { data: cats } = useCategories();
  const [name, setName] = useState("");
  const [f, setF] = useState({ title: "", description: "", category: "Contas", price: "", stock: "" });
  const [photo, setPhoto] = useState<File | null>(null);

  const { data: seller, isLoading } = useQuery({
    queryKey: ["seller", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data } = await supabase.from("seller_profiles").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });
  const { data: mine } = useQuery({
    queryKey: ["seller", "products", user?.id],
    enabled: Boolean(seller),
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*").eq("seller_id", user!.id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const activate = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("seller_profiles").insert({ user_id: user!.id, display_name: name.trim() });
      if (error) throw error;
      void notifyAdmin({ data: { kind: "seller" } }).catch(() => undefined);
    },
    onSuccess: () => {
      toast.success("Modo vendedor ativado!");
      void qc.invalidateQueries({ queryKey: ["seller"] });
    },
    onError: () => toast.error("Não foi possível ativar."),
  });

  const cents = Math.round(Number(f.price.replace(",", ".")) * 100) || 0;
  const fee = Math.floor(cents * 0.2);

  const publish = useMutation({
    mutationFn: async () => {
      let image_url: string | null = null;
      if (photo) {
        const ext = photo.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
        const path = `sellers/${user!.id}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("product-images").upload(path, photo, { contentType: photo.type });
        if (error) throw error;
        image_url = `/api/public/product-image?path=${encodeURIComponent(path)}`;
      }
      const { data: p, error } = await supabase
        .from("products")
        .insert({ title: f.title, description: f.description, category: f.category, price_cents: cents, image_url, seller_id: user!.id, featured: false })
        .select("id")
        .single();
      if (error) throw error;
      const rows = splitStock(f.stock).map((content) => ({ product_id: p.id, content }));
      if (rows.length) {
        const { error: e2 } = await supabase.from("product_stock_items").insert(rows);
        if (e2) throw e2;
      }
    },
    onSuccess: () => {
      toast.success("Anúncio publicado!");
      setF({ title: "", description: "", category: "Contas", price: "", stock: "" });
      setPhoto(null);
      void qc.invalidateQueries();
    },
    onError: () => toast.error("Não foi possível publicar o anúncio."),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries(),
  });

  return (
    <StoreShell>
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
        <h1 className="font-display text-xl">Vender na loja</h1>
        {isLoading ? null : !seller ? (
          <div className="panel space-y-3 p-5">
            <p className="text-sm">Ative o modo vendedor. Você recebe 80% de cada venda, liberado 3 dias após a compra.</p>
            <Input placeholder="Nome exibido nos anúncios" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
            <Button disabled={!name.trim() || activate.isPending} onClick={() => activate.mutate()}>Quero vender</Button>
          </div>
        ) : (
          <>
            <div className="panel space-y-3 p-5">
              <p className="text-sm font-semibold">Novo anúncio</p>
              <Input placeholder="Título" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
              <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
                {(cats ?? []).map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
              <Textarea placeholder="Descrição" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
              <Input placeholder="Preço (ex: 10,00)" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} />
              {cents > 0 ? (
                <p className="rounded-lg border border-primary/30 bg-primary/10 p-3 text-xs">
                  Preço {formatBRL(cents)} · Taxa da loja (20%) {formatBRL(fee)} ·{" "}
                  <strong className="text-success">Você recebe {formatBRL(cents - fee)}</strong>
                </p>
              ) : null}
              <Input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
              <Textarea rows={5} placeholder={"Estoque (separe cada entrega com --)\nlogin: a\nsenha: 1\n--\nlogin: b\nsenha: 2"} value={f.stock} onChange={(e) => setF({ ...f, stock: e.target.value })} />
              <p className="text-xs text-muted-foreground">{splitStock(f.stock).length} entrega(s) no estoque</p>
              <Button disabled={!f.title.trim() || cents <= 0 || publish.isPending} onClick={() => publish.mutate()}>Publicar anúncio</Button>
            </div>
            <div className="space-y-2">
              {(mine ?? []).map((p) => (
                <div key={p.id} className="panel flex items-center justify-between p-4 text-sm">
                  <span>{p.title} · {formatBRL(p.price_cents)} · estoque {p.stock_count}{p.active ? "" : " · desativado pela loja"}</span>
                  <Button size="sm" variant="outline" onClick={() => remove.mutate(p.id)}>Apagar</Button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </StoreShell>
  );
}
