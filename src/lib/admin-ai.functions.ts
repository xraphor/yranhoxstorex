import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ADMIN_EMAIL } from "@/lib/store";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

const InputSchema = z.object({
  messages: z.array(MessageSchema).min(1).max(40),
});

const SYSTEM_PROMPT = `Você é o Copiloto da yRanhox Store X, o assistente administrativo do dono da loja (loja de produtos digitais: contas, keys, scripts, itens de jogos, métodos).

Você obedece às ordens do dono e executa de verdade usando as ferramentas disponíveis.
Regras:
- Fale sempre em português do Brasil, direto e amigável.
- Quando o dono pedir para criar, alterar ou apagar algo, use a ferramenta correspondente imediatamente, sem pedir confirmação para tarefas simples de conteúdo (produtos, estoque, categorias, avisos, comentários).
- Pergunte antes APENAS quando a ordem mexe em dinheiro ou é destrutiva sem volta: aprovar pedido, excluir produto com vendas, apagar muitas coisas de uma vez.
- Se faltar um dado obrigatório (ex: preço), escolha um valor sensato e diga o que escolheu, ou pergunte em uma única frase curta.
- Preços sempre em reais (ex: 49.90). Você converte para centavos internamente pelas ferramentas.
- Estoque digital: cada entrega é um item completo (pode ter várias linhas, como login e senha juntos).
- Você também escreve conteúdo: descrições vendedoras, títulos, anúncios para Discord/WhatsApp, tutoriais de ativação, termos de garantia, respostas de suporte. Nesses casos entregue o texto pronto.
- Ao terminar uma ação, responda curto confirmando o que foi feito (1 a 3 frases). Use markdown simples quando ajudar.
- Nunca invente que fez algo: só afirme depois que a ferramenta retornar sucesso.`;

type Json = Record<string, unknown>;

const tools = [
  {
    type: "function",
    function: {
      name: "listar_produtos",
      description: "Lista os produtos da loja com id, título, categoria, preço e estoque.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "criar_produto",
      description: "Cria um novo produto na loja.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          category: { type: "string" },
          price_brl: { type: "number" },
          original_price_brl: { type: "number" },
          tags: { type: "array", items: { type: "string" } },
          warranty: { type: "string" },
          active: { type: "boolean" },
          featured: { type: "boolean" },
        },
        required: ["title", "price_brl"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "atualizar_produto",
      description: "Atualiza campos de um produto existente.",
      parameters: {
        type: "object",
        properties: {
          product_id: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          category: { type: "string" },
          price_brl: { type: "number" },
          original_price_brl: { type: "number" },
          tags: { type: "array", items: { type: "string" } },
          warranty: { type: "string" },
          active: { type: "boolean" },
          featured: { type: "boolean" },
        },
        required: ["product_id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "excluir_produto",
      description: "Exclui um produto da loja.",
      parameters: {
        type: "object",
        properties: { product_id: { type: "string" } },
        required: ["product_id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "adicionar_estoque",
      description:
        "Adiciona entregas ao estoque digital de um produto. Cada string da lista é uma entrega completa (pode conter várias linhas).",
      parameters: {
        type: "object",
        properties: {
          product_id: { type: "string" },
          items: { type: "array", items: { type: "string" } },
        },
        required: ["product_id", "items"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "listar_categorias",
      description: "Lista as categorias da loja.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "criar_categoria",
      description: "Cria uma categoria nova na vitrine.",
      parameters: {
        type: "object",
        properties: { name: { type: "string" }, sort_order: { type: "number" } },
        required: ["name"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "excluir_categoria",
      description: "Exclui uma categoria pelo nome.",
      parameters: {
        type: "object",
        properties: { name: { type: "string" } },
        required: ["name"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "ler_configuracoes",
      description: "Lê as configurações da loja (banner, aviso do topo, suporte, tema).",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "atualizar_configuracoes",
      description: "Atualiza banner, aviso do topo e link de suporte da loja.",
      parameters: {
        type: "object",
        properties: {
          banner_title: { type: "string" },
          banner_subtitle: { type: "string" },
          top_notice: { type: "string" },
          support_link: { type: "string" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "mudar_tema",
      description:
        "Publica um novo tema de cores para TODA a loja (vale para todos os visitantes). Opções: purple (Roxo Neon), cyan (Ciano Cyber), emerald (Verde Esmeralda), orange (Laranja Vulcão). Escolha a mais próxima do que o dono descrever.",
      parameters: {
        type: "object",
        properties: {
          accent: { type: "string", enum: ["purple", "cyan", "emerald", "orange"] },
        },
        required: ["accent"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "publicar_comentario",
      description:
        "Publica um comentário na loja com nome e nota escolhidos. Sempre aparece marcado como publicado pela loja.",
      parameters: {
        type: "object",
        properties: {
          product_id: { type: "string", description: "Vazio para aparecer em todos os produtos." },
          author_name: { type: "string" },
          rating: { type: "number" },
          message: { type: "string" },
        },
        required: ["author_name", "message"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "listar_pedidos",
      description: "Lista pedidos recentes, opcionalmente filtrando por situação.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["pending", "awaiting_confirmation", "paid", "cancelled"] },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "aprovar_pedido",
      description: "Aprova um pedido pago e libera a entrega automática do produto.",
      parameters: {
        type: "object",
        properties: { order_id: { type: "string" } },
        required: ["order_id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "relatorio_vendas",
      description: "Resumo de faturamento e vendas dos últimos dias.",
      parameters: {
        type: "object",
        properties: { dias: { type: "number" } },
        additionalProperties: false,
      },
    },
  },
] as const;

function brlToCents(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

async function runTool(name: string, args: Json) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const productPayload = () => {
    const payload: Json = {};
    if (typeof args["title"] === "string") payload["title"] = args["title"];
    if (typeof args["description"] === "string") payload["description"] = args["description"];
    if (typeof args["category"] === "string") payload["category"] = args["category"];
    if (args["price_brl"] !== undefined) payload["price_cents"] = brlToCents(args["price_brl"]);
    if (args["original_price_brl"] !== undefined)
      payload["original_price_cents"] = brlToCents(args["original_price_brl"]);
    if (Array.isArray(args["tags"])) payload["tags"] = args["tags"];
    if (typeof args["warranty"] === "string") payload["warranty"] = args["warranty"];
    if (typeof args["active"] === "boolean") payload["active"] = args["active"];
    if (typeof args["featured"] === "boolean") payload["featured"] = args["featured"];
    return payload;
  };

  switch (name) {
    case "listar_produtos": {
      const { data, error } = await supabaseAdmin
        .from("products")
        .select("id,title,category,price_cents,stock_count,active,featured")
        .order("created_at", { ascending: false })
        .limit(60);
      if (error) throw error;
      return data;
    }
    case "criar_produto": {
      const payload = productPayload();
      if (!payload["description"]) payload["description"] = "";
      const { data, error } = await supabaseAdmin
        .from("products")
        .insert(payload as never)
        .select("id,title,price_cents")
        .single();
      if (error) throw error;
      return data;
    }
    case "atualizar_produto": {
      const { data, error } = await supabaseAdmin
        .from("products")
        .update(productPayload() as never)
        .eq("id", String(args["product_id"]))
        .select("id,title,price_cents,active")
        .single();
      if (error) throw error;
      return data;
    }
    case "excluir_produto": {
      const { error } = await supabaseAdmin
        .from("products")
        .delete()
        .eq("id", String(args["product_id"]));
      if (error) throw error;
      return { ok: true };
    }
    case "adicionar_estoque": {
      const items = Array.isArray(args["items"]) ? (args["items"] as string[]) : [];
      const rows = items
        .map((content) => String(content).trim())
        .filter(Boolean)
        .map((content) => ({ product_id: String(args["product_id"]), content }));
      if (!rows.length) return { ok: false, motivo: "nenhuma entrega informada" };
      const { error } = await supabaseAdmin.from("product_stock_items").insert(rows);
      if (error) throw error;
      return { ok: true, adicionados: rows.length };
    }
    case "listar_categorias": {
      const { data, error } = await supabaseAdmin
        .from("categories")
        .select("id,name,sort_order")
        .order("sort_order");
      if (error) throw error;
      return data;
    }
    case "criar_categoria": {
      const { data, error } = await supabaseAdmin
        .from("categories")
        .insert({
          name: String(args["name"]),
          ...(args["sort_order"] !== undefined ? { sort_order: Number(args["sort_order"]) } : {}),
        })
        .select("id,name")
        .single();
      if (error) throw error;
      return data;
    }
    case "excluir_categoria": {
      const { error } = await supabaseAdmin
        .from("categories")
        .delete()
        .eq("name", String(args["name"]));
      if (error) throw error;
      return { ok: true };
    }
    case "ler_configuracoes": {
      const { data, error } = await supabaseAdmin
        .from("store_settings")
        .select("banner_title,banner_subtitle,top_notice,support_link")
        .eq("id", 1)
        .single();
      if (error) throw error;
      return data;
    }
    case "atualizar_configuracoes": {
      const payload: Json = {};
      for (const key of ["banner_title", "banner_subtitle", "top_notice", "support_link"]) {
        if (typeof args[key] === "string") payload[key] = args[key];
      }
      if (!Object.keys(payload).length) return { ok: false, motivo: "nada para atualizar" };
      const { data, error } = await supabaseAdmin
        .from("store_settings")
        .update(payload as never)
        .eq("id", 1)
        .select("banner_title,banner_subtitle,top_notice,support_link")
        .single();
      if (error) throw error;
      return data;
    }
    case "publicar_comentario": {
      const rating = Math.min(5, Math.max(1, Math.round(Number(args["rating"]) || 5)));
      const { data, error } = await supabaseAdmin
        .from("product_reviews")
        .insert({
          product_id: args["product_id"] ? String(args["product_id"]) : null,
          author_name: String(args["author_name"]).slice(0, 80),
          message: String(args["message"]),
          rating,
          is_official: true,
        })
        .select("id,author_name,rating")
        .single();
      if (error) throw error;
      return data;
    }
    case "listar_pedidos": {
      let query = supabaseAdmin
        .from("orders")
        .select("id,buyer_email,status,total_cents,created_at,paid_at")
        .order("created_at", { ascending: false })
        .limit(40);
      if (typeof args["status"] === "string") query = query.eq("status", args["status"] as string);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
    case "aprovar_pedido": {
      const { error } = await supabaseAdmin.rpc("approve_order", {
        p_order_id: String(args["order_id"]),
      });
      if (error) throw error;
      return { ok: true };
    }
    case "relatorio_vendas": {
      const dias = Number(args["dias"]) || 30;
      const since = new Date(Date.now() - dias * 86400000).toISOString();
      const { data, error } = await supabaseAdmin
        .from("orders")
        .select("total_cents,status,paid_at")
        .gte("created_at", since);
      if (error) throw error;
      const paid = (data ?? []).filter((o) => o.status === "paid");
      const totalCents = paid.reduce((acc, o) => acc + o.total_cents, 0);
      return {
        dias,
        pedidos_pagos: paid.length,
        faturamento_reais: (totalCents / 100).toFixed(2),
        pendentes: (data ?? []).filter(
          (o) => o.status === "pending" || o.status === "awaiting_confirmation",
        ).length,
      };
    }
    default:
      return { ok: false, motivo: "ferramenta desconhecida" };
  }
}

// Claude via Lovable AI Gateway (API nativa /v1/messages).
// Não depende de chave própria da OpenAI/Anthropic — usa a chave embutida do projeto.
const CLAUDE_URL = "https://ai.gateway.lovable.dev/v1/messages";
const CLAUDE_MODEL = "anthropic/claude-sonnet-5";

const claudeTools = tools.map((t) => ({
  name: t.function.name,
  description: t.function.description,
  input_schema: t.function.parameters,
}));

type ClaudeBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Json }
  | { type: "thinking"; thinking: string; signature: string }
  | { type: "redacted_thinking"; data: string };

type ClaudeMessage = { role: "user" | "assistant"; content: string | ClaudeBlock[] };

async function callClaude(apiKey: string, messages: ClaudeMessage[]) {
  const response = await fetch(CLAUDE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      messages,
      tools: claudeTools,
      tool_choice: { type: "auto" },
      stream: true,
    }),
  });

  if (!response.ok) {
    const status = response.status;
    const detail = await response.text();
    console.error("[admin-ai]", status, detail.slice(0, 500));
    return { error: status as number, detail };
  }

  // Consome o stream SSE e acumula o resultado final (texto, raciocínio e ferramentas).
  const blocks: (ClaudeBlock | undefined)[] = [];
  const jsonAcc: Record<number, string> = {};
  let stopReason = "";
  let buffer = "";
  const body = response.body;
  if (!body) return { error: 502 as number, detail: "sem corpo de resposta" };
  const reader = body.getReader();
  const decoder = new TextDecoder();

  const handleEvent = (raw: string) => {
    const line = raw.split("\n").find((l) => l.startsWith("data:"));
    if (!line) return;
    const data = line.slice(5).trim();
    if (!data || data === "[DONE]") return;
    let event: {
      type: string;
      index?: number;
      content_block?: { type: string; id?: string; name?: string; data?: string };
      delta?: {
        type?: string;
        text?: string;
        partial_json?: string;
        thinking?: string;
        signature?: string;
        stop_reason?: string;
      };
    };
    try {
      event = JSON.parse(data);
    } catch {
      return;
    }
    const i = event.index ?? 0;
    if (event.type === "content_block_start" && event.content_block) {
      const cb = event.content_block;
      if (cb.type === "text") blocks[i] = { type: "text", text: "" };
      else if (cb.type === "tool_use")
        blocks[i] = { type: "tool_use", id: cb.id ?? "", name: cb.name ?? "", input: {} };
      else if (cb.type === "thinking") blocks[i] = { type: "thinking", thinking: "", signature: "" };
      else if (cb.type === "redacted_thinking") blocks[i] = { type: "redacted_thinking", data: cb.data ?? "" };
    }
    if (event.type === "content_block_delta" && event.delta) {
      const block = blocks[i];
      if (!block) return;
      const d = event.delta;
      if (d.type === "text_delta" && block.type === "text") block.text += d.text ?? "";
      if (d.type === "input_json_delta" && block.type === "tool_use")
        jsonAcc[i] = (jsonAcc[i] ?? "") + (d.partial_json ?? "");
      if (d.type === "thinking_delta" && block.type === "thinking") block.thinking += d.thinking ?? "";
      if (d.type === "signature_delta" && block.type === "thinking") block.signature += d.signature ?? "";
    }
    if (event.type === "message_delta" && event.delta?.stop_reason) stopReason = event.delta.stop_reason;
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) handleEvent(part);
  }
  if (buffer.trim()) handleEvent(buffer);

  // Finaliza os inputs das ferramentas e remove posições vazias.
  const finalBlocks: ClaudeBlock[] = [];
  blocks.forEach((block, i) => {
    if (!block) return;
    if (block.type === "tool_use") {
      try {
        block.input = jsonAcc[i] ? (JSON.parse(jsonAcc[i]) as Json) : {};
      } catch {
        block.input = {};
      }
    }
    finalBlocks.push(block);
  });

  return { blocks: finalBlocks, stopReason };
}

export const adminAiChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const email = String(context.claims["email"] ?? "").toLowerCase();
    if (email !== ADMIN_EMAIL) {
      throw new Error("Acesso não autorizado");
    }

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) {
      return { reply: "O assistente está sem chave de acesso configurada.", actions: [] as string[] };
    }

    const messages: ClaudeMessage[] = data.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));
    const actions: string[] = [];

    for (let round = 0; round < 8; round++) {
      const result = await callClaude(apiKey, messages);

      if ("error" in result) {
        const status = result.error;
        if (status === 401) return { reply: "A chave de acesso da IA foi recusada.", actions };
        if (status === 402 || status === 403)
          return {
            reply: "Os créditos de IA da loja acabaram por agora. Eles renovam todo mês — tente de novo em breve.",
            actions,
          };
        if (status === 429)
          return { reply: "Muitas mensagens seguidas. Aguarde alguns segundos e tente de novo.", actions };
        return { reply: "A IA não respondeu agora. Tente de novo.", actions };
      }

      const blocks = result.blocks;
      const toolUses = blocks.filter((b): b is Extract<ClaudeBlock, { type: "tool_use" }> => b.type === "tool_use");

      if (toolUses.length) {
        messages.push({ role: "assistant", content: blocks });
        const toolResults: { type: "tool_result"; tool_use_id: string; content: string }[] = [];
        for (const call of toolUses) {
          let toolResult: unknown;
          try {
            toolResult = await runTool(call.name, call.input);
            actions.push(call.name);
          } catch (error) {
            toolResult = { erro: error instanceof Error ? error.message : "falha ao executar" };
          }
          toolResults.push({
            type: "tool_result",
            tool_use_id: call.id,
            content: JSON.stringify(toolResult).slice(0, 8000),
          });
        }
        messages.push({ role: "user", content: toolResults as unknown as ClaudeBlock[] });
        continue;
      }

      const text = blocks
        .filter((b): b is Extract<ClaudeBlock, { type: "text" }> => b.type === "text")
        .map((b) => b.text)
        .join("")
        .trim();
      return { reply: text || "Feito!", actions };
    }

    return { reply: "A tarefa ficou longa demais. Tente dividir o pedido.", actions };
  });
