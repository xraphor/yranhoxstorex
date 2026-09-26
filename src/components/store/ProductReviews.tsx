import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Loader2, Star } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function Stars({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(n)}
          aria-label={`${n} estrelas`}
        >
          <Star
            className={`size-4 ${n <= value ? "fill-warning text-warning" : "text-muted-foreground"}`}
          />
        </button>
      ))}
    </div>
  );
}

export function ProductReviews({ productId }: { productId: string }) {
  const { session, email } = useSession();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState(5);

  const { data: reviews } = useQuery({
    queryKey: ["reviews", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_reviews")
        .select("*")
        .or(`product_id.eq.${productId},product_id.is.null`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const send = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("product_reviews").insert({
        product_id: productId,
        user_id: session!.user.id,
        author_name: name.trim() || (email ?? "Cliente").split("@")[0]!,
        message: message.trim(),
        rating,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Avaliação publicada!");
      setMessage("");
      void queryClient.invalidateQueries({ queryKey: ["reviews", productId] });
    },
    onError: () => toast.error("Só quem comprou este produto pode avaliar."),
  });

  return (
    <section className="mx-auto max-w-6xl space-y-4 px-4 pb-14">
      <h2 className="font-display text-lg">Avaliações ({reviews?.length ?? 0})</h2>

      {session ? (
        <div className="panel space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              className="max-w-xs"
              placeholder="Seu nome (opcional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Stars value={rating} onChange={setRating} />
          </div>
          <Textarea
            rows={3}
            placeholder="Conte como foi sua compra..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <Button size="sm" disabled={!message.trim() || send.isPending} onClick={() => send.mutate()}>
            {send.isPending ? <Loader2 className="size-4 animate-spin" /> : null} Publicar avaliação
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Entre na sua conta para avaliar após a compra.</p>
      )}

      {(reviews ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">Ainda não há avaliações.</p>
      ) : (
        <ul className="space-y-3">
          {reviews!.map((r) => (
            <li key={r.id} className="panel p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">{r.author_name}</span>
                {r.is_official ? (
                  <span className="inline-flex items-center gap-1 text-xs text-primary">
                    <BadgeCheck className="size-3.5" /> Publicado pela loja
                  </span>
                ) : (
                  <span className="text-xs text-success">Compra verificada</span>
                )}
                <Stars value={r.rating} />
                <span className="ml-auto text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString("pt-BR")}
                </span>
              </div>
              <p className="mt-2 text-sm whitespace-pre-wrap text-muted-foreground">{r.message}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
