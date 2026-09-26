import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCategories } from "@/hooks/useCategories";
import { Stars } from "@/components/store/ProductReviews";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function CategoriesPanel() {
  const qc = useQueryClient();
  const { data: cats, isLoading } = useCategories();
  const [name, setName] = useState("");

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("categories")
        .insert({ name: name.trim(), sort_order: (cats?.length ?? 0) + 1 });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Categoria criada.");
      setName("");
      void qc.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: () => toast.error("Não foi possível criar (nome repetido?)."),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Categoria apagada.");
      void qc.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: () => toast.error("Não foi possível apagar."),
  });

  return (
    <div className="panel space-y-4 p-5">
      <div className="flex gap-2">
        <Input placeholder="Nova categoria" value={name} onChange={(e) => setName(e.target.value)} />
        <Button disabled={!name.trim() || add.isPending} onClick={() => add.mutate()}>
          <Plus className="size-4" /> Adicionar
        </Button>
      </div>
      {isLoading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <ul className="space-y-2">
          {(cats ?? []).map((c) => (
            <li key={c.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
              {c.name}
              <Button size="sm" variant="outline" onClick={() => remove.mutate(c.id)}>
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">
        Produtos de uma categoria apagada continuam existindo; edite-os para mudar a categoria.
      </p>
    </div>
  );
}

export function ReviewsPanel() {
  const qc = useQueryClient();
  const [productId, setProductId] = useState<string>("all");
  const [authorName, setAuthorName] = useState("");
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState(5);

  const { data: products } = useQuery({
    queryKey: ["admin", "products-min"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("id,title").order("title");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: reviews } = useQuery({
    queryKey: ["admin", "reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_reviews")
        .select("*, products(title)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("product_reviews").insert({
        product_id: productId === "all" ? null : productId,
        author_name: authorName.trim(),
        message: message.trim(),
        rating,
        is_official: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Comentário da loja publicado.");
      setAuthorName("");
      setMessage("");
      void qc.invalidateQueries();
    },
    onError: () => toast.error("Não foi possível publicar."),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("product_reviews").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Comentário apagado.");
      void qc.invalidateQueries();
    },
  });

  return (
    <div className="space-y-4">
      <div className="panel space-y-3 p-5">
        <div>
          <p className="text-sm font-semibold">Publicar comentário personalizado</p>
          <p className="mt-1 text-xs text-muted-foreground">Será identificado publicamente como conteúdo da loja.</p>
        </div>
        <Select value={productId} onValueChange={setProductId}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os produtos</SelectItem>
            {(products ?? []).map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          placeholder="Nome exibido"
          maxLength={80}
        />
        <Stars value={rating} onChange={setRating} />
        <Textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Mensagem" />
        <Button disabled={!authorName.trim() || !message.trim() || add.isPending} onClick={() => add.mutate()}>
          Publicar
        </Button>
      </div>
      <ul className="space-y-2">
        {(reviews ?? []).map((r) => (
          <li key={r.id} className="panel flex items-start gap-3 p-4 text-sm">
            <div className="flex-1">
              <p className="font-semibold">
                {r.author_name}{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  · {r.products?.title ?? "Todos os produtos"} {r.is_official ? "· Loja" : "· Cliente"}
                </span>
              </p>
              <p className="mt-1 text-muted-foreground">{r.message}</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => remove.mutate(r.id)}>
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
