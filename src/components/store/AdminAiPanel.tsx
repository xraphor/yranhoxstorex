import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Send, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { adminAiChat } from "@/lib/admin-ai.functions";

type ChatMessage = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Cria uma Conta Steam com 50 jogos por 49,90 com garantia de 7 dias",
  "Escreve 3 anúncios chamativos pro Discord sobre as keys do Windows",
  "Quanto faturei nos últimos 7 dias?",
  "Cria a categoria Métodos e põe o aviso do topo de promoção de fim de semana",
];

export function AdminAiPanel() {
  const chat = useServerFn(adminAiChat);
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Oi, chefe! 👊 Sou o Copiloto da yRanhox Store X. Me manda a ordem: criar produtos, colocar estoque, mudar o aviso da loja, escrever anúncios, ver faturamento ou aprovar pedidos.",
    },
  ]);
  const listRef = useRef<HTMLDivElement>(null);

  const send = useMutation({
    mutationFn: async (history: ChatMessage[]) => {
      const result = await chat({ data: { messages: history.slice(-20) } });
      return result as { reply: string; actions: string[] };
    },
    onSuccess: (result) => {
      setMessages((current) => [...current, { role: "assistant", content: result.reply }]);
      if (result.actions.length) void queryClient.invalidateQueries();
      requestAnimationFrame(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
      });
    },
    onError: () => toast.error("A IA não respondeu agora. Tente de novo."),
  });

  function submit(text: string) {
    const value = text.trim();
    if (!value || send.isPending) return;
    const next: ChatMessage[] = [...messages, { role: "user", content: value }];
    setMessages(next);
    setInput("");
    send.mutate(next);
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    });
  }

  return (
    <div className="panel flex flex-col gap-4 p-5">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-primary" />
        <h2 className="font-display text-sm">Copiloto da loja</h2>
      </div>

      <div ref={listRef} className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
        {messages.map((message, index) => (
          <div
            key={index}
            className={
              message.role === "user"
                ? "ml-auto max-w-[85%] rounded-lg rounded-br-sm bg-primary/15 px-3 py-2 text-sm"
                : "mr-auto max-w-[90%] rounded-lg rounded-bl-sm bg-surface-2 px-3 py-2 text-sm"
            }
          >
            <div className="prose prose-sm prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          </div>
        ))}
        {send.isPending ? (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3 animate-spin" /> Trabalhando...
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((suggestion) => (
          <Button
            key={suggestion}
            type="button"
            size="sm"
            variant="outline"
            className="h-auto whitespace-normal py-1 text-left text-xs"
            disabled={send.isPending}
            onClick={() => submit(suggestion)}
          >
            {suggestion}
          </Button>
        ))}
      </div>

      <div className="flex items-end gap-2">
        <Textarea
          rows={2}
          value={input}
          placeholder="Escreva sua ordem para a IA..."
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit(input);
            }
          }}
        />
        <Button type="button" disabled={send.isPending || !input.trim()} onClick={() => submit(input)}>
          {send.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </Button>
      </div>
    </div>
  );
}
