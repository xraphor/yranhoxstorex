import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus, Send, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  adminAiChat,
  getAdminCopilotModels,
  testAdminCopilotConnection,
} from "@/lib/admin-ai.functions";
import {
  createAdminConversation,
  getAdminConversation,
  listAdminConversations,
} from "@/lib/admin-conversations.functions";

type ChatMessage = { role: "user" | "assistant"; content: string; actions?: string[] };

const SUGGESTIONS = [
  "Cria uma Conta Steam com 50 jogos por 49,90 com garantia de 7 dias",
  "Escreve 3 anúncios chamativos pro Discord sobre as keys do Windows",
  "Quanto faturei nos últimos 7 dias?",
  "Cria a categoria Métodos e põe o aviso do topo de promoção de fim de semana",
];

export function AdminAiPanel() {
  const chat = useServerFn(adminAiChat);
  const testConnection = useServerFn(testAdminCopilotConnection);
  const connectionTest = useMutation({
    mutationFn: () => testConnection(),
    onError: () => toast.error("Não foi possível testar a conexão."),
  });
  const queryClient = useQueryClient();
  const [modelId, setModelId] = useState("mistral-small");
  const listModels = useServerFn(getAdminCopilotModels);
  const modelOptions = useQuery({
    queryKey: ["admin-copilot-models"],
    queryFn: () => listModels(),
  });
  const chosenModel = modelOptions.data?.find((model) => model.id === modelId);
  const modelUnavailable = !chosenModel?.configured;
  const [input, setInput] = useState("");
  const [threadId, setThreadId] = useState<string | null>(null);
  const [optimisticMessage, setOptimisticMessage] = useState<string | null>(null);
  const [unsavedReply, setUnsavedReply] = useState<ChatMessage | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listConversations = useServerFn(listAdminConversations);
  const createConversation = useServerFn(createAdminConversation);
  const getConversation = useServerFn(getAdminConversation);
  const conversations = useQuery({
    queryKey: ["admin-conversations"],
    queryFn: () => listConversations(),
  });
  const history = useQuery({
    queryKey: ["admin-conversation", threadId],
    enabled: Boolean(threadId),
    queryFn: () => getConversation({ data: { threadId: threadId! } }),
  });
  const messages: ChatMessage[] = [
    ...(history.data ?? []),
    ...(optimisticMessage ? [{ role: "user" as const, content: optimisticMessage }] : []),
    ...(unsavedReply ? [unsavedReply] : []),
  ];

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [history.data, optimisticMessage, unsavedReply]);

  const send = useMutation({
    mutationFn: async (message: string) => {
      let activeId = threadId;
      if (!activeId) {
        const thread = await createConversation({ data: { title: message.slice(0, 80) } });
        activeId = thread.id;
        setThreadId(activeId);
      }
      const result = await chat({ data: { threadId: activeId, message, modelId } });
      return { ...result, threadId: activeId };
    },
    onSuccess: async (result) => {
      if ("historySaved" in result && !result.historySaved) {
        setUnsavedReply({ role: "assistant", content: result.reply, actions: result.actions });
        toast.error("A resposta não foi salva. Confira as alterações antes de repetir a ordem.");
      } else if (!("historySaved" in result)) {
        setUnsavedReply({ role: "assistant", content: result.reply, actions: result.actions });
      }
      if (result.actions.length) {
        await queryClient.invalidateQueries({
          predicate: (query) => !String(query.queryKey[0]).startsWith("admin-conversation"),
        });
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-conversation", result.threadId] }),
        queryClient.invalidateQueries({ queryKey: ["admin-conversations"] }),
      ]);
      setOptimisticMessage(null);
    },
    onError: async () => {
      setOptimisticMessage(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-conversation"] });
      toast.error("Falha no envio. Confira o histórico e as alterações antes de repetir a ordem.");
    },
  });

  function submit(text: string) {
    const value = text.trim();
    if (
      connectionTest.isPending ||
      modelUnavailable ||
      !value ||
      value.length > 4000 ||
      send.isPending ||
      history.isFetching ||
      conversations.isPending ||
      conversations.isError ||
      history.isError
    )
      return;
    setOptimisticMessage(value);
    setUnsavedReply(null);
    setInput("");
    send.mutate(value);
  }

  function selectConversation(id: string | null) {
    setThreadId(id);
    setOptimisticMessage(null);
    setUnsavedReply(null);
    setInput("");
  }

  return (
    <div className="panel flex flex-col gap-4 p-5">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-primary" />
        <h2 className="font-display text-sm">Copiloto da loja</h2>
      </div>

      <div className="space-y-2">
        <label htmlFor="copilot-model" className="text-sm">
          Modelo da IA
        </label>
        <select
          id="copilot-model"
          className="w-full rounded-md border border-border bg-background p-2 text-sm"
          value={modelId}
          disabled={send.isPending || connectionTest.isPending || modelOptions.isPending}
          onChange={(event) => setModelId(event.target.value)}
        >
          {modelOptions.data?.map((model) => (
            <option key={model.id} value={model.id}>
              {model.label}
              {model.configured ? "" : " — configuração pendente"}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">{chosenModel?.description}</p>
        {chosenModel && !chosenModel.configured ? (
          <p role="status" className="text-xs text-muted-foreground">
            {chosenModel.reason}
          </p>
        ) : null}
        <Button
          type="button"
          variant="outline"
          disabled={modelUnavailable || send.isPending || connectionTest.isPending}
          onClick={() => connectionTest.mutate()}
        >
          {connectionTest.isPending ? "Testando conexão..." : "Testar conexão"}
        </Button>
        {connectionTest.data ? (
          <p role="status" className="text-xs text-muted-foreground">
            {connectionTest.data.message}
          </p>
        ) : null}
        {modelOptions.isError ? (
          <Button type="button" variant="outline" onClick={() => void modelOptions.refetch()}>
            Recarregar modelos
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Conversas do Copiloto"
          className="min-w-0 flex-1 rounded-md border border-border bg-background p-2 text-sm"
          value={threadId ?? ""}
          disabled={send.isPending || conversations.isPending}
          onChange={(event) => selectConversation(event.target.value || null)}
        >
          <option value="">Nova conversa</option>
          {conversations.data?.map((thread) => (
            <option key={thread.id} value={thread.id}>
              {thread.title}
            </option>
          ))}
        </select>
        <Button
          type="button"
          variant="outline"
          disabled={
            modelUnavailable ||
            send.isPending ||
            history.isFetching ||
            conversations.isPending ||
            conversations.isError ||
            history.isError
          }
          onClick={() => selectConversation(null)}
        >
          <Plus className="size-4" /> Nova
        </Button>
      </div>
      {conversations.isError || history.isError ? (
        <div role="alert" className="text-sm text-destructive">
          Não foi possível carregar as conversas.
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              void conversations.refetch();
              if (threadId) void history.refetch();
            }}
          >
            Tentar novamente
          </Button>
        </div>
      ) : null}

      <div ref={listRef} className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
        {history.isPending && threadId ? (
          <p role="status" className="text-sm text-muted-foreground">
            Carregando histórico...
          </p>
        ) : null}
        {!threadId && !messages.length ? (
          <p className="text-sm text-muted-foreground">
            Comece uma conversa para criar produtos, consultar a loja ou escrever anúncios. As
            conversas ficam salvas aqui.
          </p>
        ) : null}
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
            {message.actions?.length ? (
              <p className="mt-2 break-words text-xs text-muted-foreground">
                Ferramentas executadas: {message.actions.join(", ")}
              </p>
            ) : null}
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
            disabled={
              modelUnavailable ||
              send.isPending ||
              history.isFetching ||
              conversations.isPending ||
              conversations.isError ||
              history.isError
            }
            onClick={() => submit(suggestion)}
          >
            {suggestion}
          </Button>
        ))}
      </div>

      <div className="flex items-end gap-2">
        <Textarea
          rows={2}
          aria-label="Mensagem para o Copiloto"
          maxLength={4000}
          disabled={
            modelUnavailable ||
            send.isPending ||
            history.isFetching ||
            conversations.isPending ||
            conversations.isError ||
            history.isError
          }
          value={input}
          placeholder="Escreva sua ordem para a IA..."
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit(input);
            }
          }}
        />
        <Button
          type="button"
          aria-label="Enviar mensagem"
          disabled={
            modelUnavailable ||
            send.isPending ||
            !input.trim() ||
            history.isFetching ||
            conversations.isPending ||
            conversations.isError ||
            history.isError
          }
          onClick={() => submit(input)}
        >
          {send.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
