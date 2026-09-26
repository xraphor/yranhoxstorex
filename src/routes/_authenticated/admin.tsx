import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { StoreShell } from "@/components/store/StoreShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIES, formatBRL, ORDER_STATUS } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Painel administrativo — yRanhox Store X" },
      { name: "description", content: "Gerenciamento de produtos, estoque, pedidos e configurações." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Painel administrativo — yRanhox Store X" },
      { property: "og:description", content: "Área restrita da loja." },
    ],
  }),
  component: AdminPage,
});

type ProductForm = {
  id?: string;
  title: string;
  description: string;
  category: string;
  price: string;
  original_price: string;
  image_url: string;
  images: string;
  tags: string;
  warranty: string;
  active: boolean;
  featured: boolean;
};

const EMPTY_FORM: ProductForm = {
  title: "",
  description: "",
  category: "Contas",
  price: "",
  original_price: "",
  image_url: "",
  images: "",
  tags: "",
  warranty: "",
  active: true,
  featured: false,
};

function toCents(value: string) {
  const n = Number(value.replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

function AdminPage() {
  const { isAdmin, loading } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAdmin) {
      toast.error("Acesso não autorizado");
      navigate({ to: "/", replace: true });
    }
  }, [loading, isAdmin, navigate]);

  if (loading || !isAdmin) {
    return (
      <StoreShell>
        <div className="mx-auto max-w-5xl px-4 py-16">
          <Skeleton className="h-40 rounded-xl" />
        </div>
      </StoreShell>
    );
  }

  return (
    <StoreShell>
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-10">
        <h1 className="font-display text-xl">Painel administrativo</h1>
        <Tabs defaultValue="dashboard">
          <TabsList className="flex-wrap">
            <TabsTrigger value="dashboard">Visão geral</TabsTrigger>
            <TabsTrigger value="products">Produtos</TabsTrigger>
            <TabsTrigger value="orders">Pedidos</TabsTrigger>
            <TabsTrigger value="settings">Configurações</TabsTrigger>
          </TabsList>
          <TabsContent value="dashboard" className="pt-5">
            <Dashboard />
          </TabsContent>
          <TabsContent value="products" className="pt-5">
            <ProductsPanel />
          </TabsContent>
          <TabsContent value="orders" className="pt-5">
            <OrdersPanel />
          </TabsContent>
          <TabsContent value="settings" className="pt-5">
            <SettingsPanel />
          </TabsContent>
        </Tabs>
      </div>
    </StoreShell>
  );
}

function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: async () => {
      const [{ data: orders, error }, { data: products, error: pErr }] = await Promise.all([
        supabase.from("orders").select("total_cents,status,paid_at,created_at"),
        supabase.from("products").select("id,title,stock_count,active"),
      ]);
      if (error) throw error;
      if (pErr) throw pErr;
      return { orders: orders ?? [], products: products ?? [] };
    },
  });

  if (isLoading) return <Skeleton className="h-52 rounded-xl" />;

  const orders = data?.orders ?? [];
  const paid = orders.filter((o) => o.status === "paid");
  const now = Date.now();
  const sum = (days: number) =>
    paid
      .filter((o) => o.paid_at && now - new Date(o.paid_at).getTime() <= days * 86400000)
      .reduce((acc, o) => acc + o.total_cents, 0);

  const lowStock = (data?.products ?? []).filter((p) => p.active && p.stock_count <= 2);

  const cards = [
    { label: "Faturamento hoje", value: formatBRL(sum(1)) },
    { label: "Últimos 7 dias", value: formatBRL(sum(7)) },
    { label: "Últimos 30 dias", value: formatBRL(sum(30)) },
    { label: "Pedidos aprovados", value: String(paid.length) },
    {
      label: "Pendentes",
      value: String(
        orders.filter((o) => o.status === "pending" || o.status === "awaiting_confirmation").length,
      ),
    },
    { label: "Cancelados", value: String(orders.filter((o) => o.status === "cancelled").length) },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="panel p-5">
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className="font-display mt-2 text-xl font-bold text-primary">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="panel p-5">
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle className="size-4 text-warning" />
          <h2 className="font-display text-sm">Estoque baixo</h2>
        </div>
        {lowStock.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum produto com estoque crítico.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {lowStock.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3">
                <span>{p.title}</span>
                <Badge variant="outline" className="border-warning/40 text-warning">
                  {p.stock_count} restante(s)
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ProductsPanel() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [open, setOpen] = useState(false);
  const [stockFor, setStockFor] = useState<{ id: string; title: string } | null>(null);
  const [stockText, setStockText] = useState("");

  const { data: products, isLoading } = useQuery({
    queryKey: ["admin", "products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async (f: ProductForm) => {
      const payload = {
        title: f.title,
        description: f.description,
        category: f.category,
        price_cents: toCents(f.price),
        original_price_cents: f.original_price ? toCents(f.original_price) : null,
        image_url: f.image_url || null,
        images: f.images
          ? f.images
              .split(/[\n,]/)
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
        tags: f.tags
          ? f.tags
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
        warranty: f.warranty || null,
        active: f.active,
        featured: f.featured,
      };
      if (f.id) {
        const { error } = await supabase.from("products").update(payload).eq("id", f.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Produto salvo!");
      setOpen(false);
      setForm(EMPTY_FORM);
      void queryClient.invalidateQueries();
    },
    onError: () => toast.error("Não foi possível salvar o produto."),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Produto excluído.");
      void queryClient.invalidateQueries();
    },
    onError: () => toast.error("Não foi possível excluir."),
  });

  const addStock = useMutation({
    mutationFn: async () => {
      if (!stockFor) return;
      const rows = stockText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((content) => ({ product_id: stockFor.id, content }));
      if (!rows.length) throw new Error("vazio");
      const { error } = await supabase.from("product_stock_items").insert(rows);
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (count) => {
      toast.success(`${count} item(ns) adicionados ao estoque.`);
      setStockText("");
      setStockFor(null);
      void queryClient.invalidateQueries();
    },
    onError: () => toast.error("Cole ao menos uma linha de conteúdo."),
  });

  function editProduct(p: Record<string, unknown>) {
    setForm({
      id: p["id"] as string,
      title: (p["title"] as string) ?? "",
      description: (p["description"] as string) ?? "",
      category: (p["category"] as string) ?? "Contas",
      price: String(((p["price_cents"] as number) ?? 0) / 100),
      original_price: p["original_price_cents"]
        ? String((p["original_price_cents"] as number) / 100)
        : "",
      image_url: (p["image_url"] as string) ?? "",
      images: ((p["images"] as string[]) ?? []).join("\n"),
      tags: ((p["tags"] as string[]) ?? []).join(", "),
      warranty: (p["warranty"] as string) ?? "",
      active: Boolean(p["active"]),
      featured: Boolean(p["featured"]),
    });
    setOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) setForm(EMPTY_FORM);
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" /> Novo produto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{form.id ? "Editar produto" : "Novo produto"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Row label="Título">
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </Row>
              <Row label="Categoria">
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm({ ...form, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Row>
              <div className="grid grid-cols-2 gap-3">
                <Row label="Preço (R$)">
                  <Input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                </Row>
                <Row label="Preço original (R$)">
                  <Input
                    value={form.original_price}
                    onChange={(e) => setForm({ ...form, original_price: e.target.value })}
                  />
                </Row>
              </div>
              <Row label="Descrição (texto ou HTML)">
                <Textarea
                  rows={5}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </Row>
              <Row label="Imagem principal (URL)">
                <Input
                  value={form.image_url}
                  onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                />
              </Row>
              <Row label="Galeria (uma URL por linha)">
                <Textarea
                  rows={3}
                  value={form.images}
                  onChange={(e) => setForm({ ...form, images: e.target.value })}
                />
              </Row>
              <Row label="Tags (separadas por vírgula)">
                <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
              </Row>
              <Row label="Termos de garantia">
                <Textarea
                  rows={2}
                  value={form.warranty}
                  onChange={(e) => setForm({ ...form, warranty: e.target.value })}
                />
              </Row>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={form.active}
                    onCheckedChange={(v) => setForm({ ...form, active: v })}
                  />
                  Ativo
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={form.featured}
                    onCheckedChange={(v) => setForm({ ...form, featured: v })}
                  />
                  Destaque
                </label>
              </div>
              <Button
                className="w-full"
                disabled={save.isPending || !form.title}
                onClick={() => save.mutate(form)}
              >
                {save.isPending ? <Loader2 className="size-4 animate-spin" /> : null} Salvar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <Skeleton className="h-40 rounded-xl" />
      ) : (
        <div className="space-y-3">
          {(products ?? []).map((p) => (
            <div key={p.id} className="panel flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-48 flex-1">
                <p className="text-sm font-semibold">{p.title}</p>
                <p className="text-xs text-muted-foreground">
                  {p.category} · {formatBRL(p.price_cents)} · estoque {p.stock_count}
                  {p.active ? "" : " · inativo"}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setStockFor({ id: p.id, title: p.title })}>
                Estoque
              </Button>
              <Button size="sm" variant="outline" onClick={() => editProduct(p)}>
                <Pencil className="size-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => remove.mutate(p.id)}>
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!stockFor} onOpenChange={(v) => !v && setStockFor(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Estoque digital — {stockFor?.title}</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Cole uma chave, login ou conteúdo por linha. Cada linha é entregue em uma venda.
          </p>
          <Textarea
            rows={8}
            value={stockText}
            onChange={(e) => setStockText(e.target.value)}
            placeholder={"CHAVE-1111-2222\nlogin:senha\nhttps://link-privado"}
          />
          <Button onClick={() => addStock.mutate()} disabled={addStock.isPending}>
            {addStock.isPending ? <Loader2 className="size-4 animate-spin" /> : null} Adicionar ao
            estoque
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OrdersPanel() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const approve = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("approve_order", { p_order_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pagamento aprovado e produto entregue.");
      void queryClient.invalidateQueries();
    },
    onError: (e) => toast.error(e.message || "Falha ao aprovar o pedido."),
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pedido atualizado.");
      void queryClient.invalidateQueries();
    },
    onError: () => toast.error("Falha ao atualizar o pedido."),
  });

  if (isLoading) return <Skeleton className="h-40 rounded-xl" />;

  return (
    <div className="space-y-3">
      {(data ?? []).map((order) => {
        const status = ORDER_STATUS[order.status] ?? ORDER_STATUS["pending"]!;
        return (
          <div key={order.id} className="panel space-y-3 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-52 flex-1">
                <p className="text-sm font-semibold">#{order.id.slice(0, 8).toUpperCase()}</p>
                <p className="text-xs text-muted-foreground">
                  {order.buyer_email} · {formatBRL(order.total_cents)} ·{" "}
                  {new Date(order.created_at).toLocaleString("pt-BR")}
                </p>
              </div>
              <Badge variant="outline" className={status.className}>
                {status.label}
              </Badge>
              {order.status !== "paid" ? (
                <Button size="sm" onClick={() => approve.mutate(order.id)} disabled={approve.isPending}>
                  <CheckCircle2 className="size-4" /> Aprovar e entregar
                </Button>
              ) : null}
              {order.status !== "cancelled" ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setStatus.mutate({ id: order.id, status: "cancelled" })}
                >
                  <XCircle className="size-4" /> Cancelar
                </Button>
              ) : null}
            </div>
            {order.order_items?.map((item) => (
              <div key={item.id} className="rounded-lg border border-border bg-surface-2/50 p-3 text-xs">
                <p className="font-medium">{item.product_title}</p>
                {item.delivered_content ? (
                  <pre className="mt-1 whitespace-pre-wrap text-muted-foreground">
                    {item.delivered_content}
                  </pre>
                ) : (
                  <p className="mt-1 text-muted-foreground">Nada entregue ainda.</p>
                )}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function SettingsPanel() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("store_settings").select("*").eq("id", 1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [form, setForm] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!data) return;
    const social = (data.social_links ?? {}) as Record<string, string>;
    setForm({
      banner_title: data.banner_title ?? "",
      banner_subtitle: data.banner_subtitle ?? "",
      top_notice: data.top_notice ?? "",
      pix_key: data.pix_key ?? "",
      pix_payload: data.pix_payload ?? "",
      support_link: data.support_link ?? "",
      discord: social["discord"] ?? "",
      instagram: social["instagram"] ?? "",
      whatsapp: social["whatsapp"] ?? "",
    });
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("store_settings")
        .update({
          banner_title: form["banner_title"] ?? "",
          banner_subtitle: form["banner_subtitle"] ?? "",
          top_notice: form["top_notice"] ?? "",
          pix_key: form["pix_key"] ?? "",
          pix_payload: form["pix_payload"] ?? "",
          support_link: form["support_link"] ?? "",
          social_links: {
            discord: form["discord"] ?? "",
            instagram: form["instagram"] ?? "",
            whatsapp: form["whatsapp"] ?? "",
          },
        })
        .eq("id", 1);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Configurações salvas.");
      void queryClient.invalidateQueries();
    },
    onError: () => toast.error("Não foi possível salvar."),
  });

  if (isLoading) return <Skeleton className="h-40 rounded-xl" />;

  const fields: [string, string][] = [
    ["banner_title", "Título do banner"],
    ["banner_subtitle", "Subtítulo do banner"],
    ["top_notice", "Aviso no topo do site"],
    ["pix_key", "Chave Pix"],
    ["pix_payload", "Pix Copia e Cola (payload)"],
    ["support_link", "Link de suporte"],
    ["discord", "Discord"],
    ["instagram", "Instagram"],
    ["whatsapp", "WhatsApp"],
  ];

  return (
    <div className="panel space-y-3 p-5">
      {fields.map(([key, label]) => (
        <Row key={key} label={label}>
          {key === "pix_payload" ? (
            <Textarea
              rows={3}
              value={form[key] ?? ""}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            />
          ) : (
            <Input
              value={form[key] ?? ""}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            />
          )}
        </Row>
      ))}
      <Button onClick={() => save.mutate()} disabled={save.isPending}>
        {save.isPending ? <Loader2 className="size-4 animate-spin" /> : null} Salvar configurações
      </Button>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
