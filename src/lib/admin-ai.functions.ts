import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ADMIN_EMAIL } from "@/lib/store";
import { findCopilotModel } from "@/lib/copilot-models";
import { conversationModelHistory } from "@/lib/admin-conversation";

const InputSchema = z.object({
  threadId: z.string().uuid(),
  modelId: z
    .string()
    .refine((id) => Boolean(findCopilotModel(id)), "Modelo não permitido")
    .default("mistral-small"),
  message: z.string().trim().min(1).max(4000),
});

export const ADMIN_COPILOT_SYSTEM_PROMPT = `Você é o Copiloto da yRanhox Store X, o assistente administrativo do dono da loja (loja de produtos digitais: contas, keys, scripts, itens de jogos, métodos).

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

export const adminCopilotToolSpecs = [
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
          image_url: { type: "string" },
          images: { type: "array", items: { type: "string" } },
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
          image_url: { type: "string" },
          images: { type: "array", items: { type: "string" } },
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
        "Publica um dos 4 temas prontos para TODA a loja: purple (Roxo Neon), cyan (Ciano Cyber), emerald (Verde Esmeralda), orange (Laranja Vulcão). Use só quando o dono pedir exatamente uma dessas cores; para qualquer outro estilo use criar_tema.",
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
      name: "criar_tema",
      description:
        "Cria e publica um tema TOTALMENTE personalizado para toda a loja (vale para todos os visitantes). Use quando o dono descrever um estilo/cor que não seja exatamente uma das 4 opções prontas. Cores em hex #RRGGBB. Mantenha bom contraste: fundo e cards escuros com destaque neon vibrante, a menos que o dono peça tema claro.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nome do tema, ex: Cyberpunk Amarelo" },
          primary: {
            type: "string",
            description: "Cor de destaque neon (botões, preços, brilho), ex: #facc15",
          },
          background: { type: "string", description: "Cor de fundo da página, ex: #0b0b10" },
          card: { type: "string", description: "Cor dos cards e painéis, ex: #16161f" },
          border: { type: "string", description: "Cor das bordas (opcional)" },
          foreground: { type: "string", description: "Cor do texto (opcional)" },
        },
        required: ["name", "primary", "background", "card"],
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
          status: {
            type: "string",
            enum: ["pending", "awaiting_confirmation", "paid", "cancelled"],
          },
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

export async function runAdminCopilotTool(name: string, args: Json) {
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
    if (typeof args["image_url"] === "string") payload["image_url"] = args["image_url"];
    if (Array.isArray(args["images"])) payload["images"] = args["images"];
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
    case "mudar_tema": {
      const accent = String(args["accent"]);
      if (!["purple", "cyan", "emerald", "orange"].includes(accent))
        return { ok: false, motivo: "tema inválido" };
      const { error } = await supabaseAdmin
        .from("store_settings")
        .update({ accent, custom_theme: null })
        .eq("id", 1);
      if (error) throw error;
      return { ok: true, tema: accent };
    }
    case "criar_tema": {
      const hex = /^#[0-9a-fA-F]{6}$/;
      const pick = (k: string) =>
        typeof args[k] === "string" && hex.test(args[k] as string)
          ? (args[k] as string)
          : undefined;
      const theme = {
        name: String(args["name"] ?? "Tema personalizado").slice(0, 60),
        primary: pick("primary"),
        background: pick("background"),
        card: pick("card"),
        ...(pick("border") ? { border: pick("border") } : {}),
        ...(pick("foreground") ? { foreground: pick("foreground") } : {}),
      };
      if (!theme.primary || !theme.background || !theme.card)
        return {
          ok: false,
          motivo: "cores inválidas: use hex #RRGGBB em primary, background e card",
        };
      const { error } = await supabaseAdmin
        .from("store_settings")
        .update({ accent: "custom", custom_theme: theme })
        .eq("id", 1);
      if (error) throw error;
      return { ok: true, tema: theme };
    }
    case "ler_configuracoes": {
      const { data, error } = await supabaseAdmin
        .from("store_settings")
        .select("banner_title,banner_subtitle,top_notice,support_link,accent,custom_theme")
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

export const adminAiChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const email = String(context.claims["email"] ?? "").toLowerCase();
    if (email !== ADMIN_EMAIL) {
      throw new Error("Acesso não autorizado");
    }

    const { resolveCopilotProvider } = await import("@/lib/copilot-provider.server");
    let provider: ReturnType<typeof resolveCopilotProvider>;
    try {
      provider = resolveCopilotProvider(data.modelId, process.env);
    } catch (error) {
      return {
        reply: error instanceof Error ? error.message : "Configure o provedor selecionado.",
        actions: [] as string[],
      };
    }

    const { data: thread, error: threadError } = await context.supabase
      .from("admin_copilot_threads")
      .select("id")
      .eq("id", data.threadId)
      .eq("user_id", context.userId)
      .single();
    if (threadError || !thread) throw new Error("Conversa não encontrada");

    const { data: history, error: historyError } = await context.supabase
      .from("admin_copilot_messages")
      .select("role, parts, actions")
      .eq("thread_id", thread.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (historyError) throw new Error("Não foi possível carregar o histórico");

    const { callMistral } = await import("@/lib/mistral.server");
    const messages: import("@/lib/mistral.server").MistralMessage[] = conversationModelHistory(
      history ?? [],
    );
    const { error: saveError } = await context.supabase.from("admin_copilot_messages").insert({
      thread_id: thread.id,
      user_id: context.userId,
      role: "user",
      parts: [{ type: "text", text: data.message }],
    });
    if (saveError) throw new Error("Não foi possível salvar a mensagem");
    messages.push({ role: "user", content: data.message });
    const actions: string[] = [];

    const respond = async (reply: string) => {
      const { error } = await context.supabase.from("admin_copilot_messages").insert({
        thread_id: thread.id,
        user_id: context.userId,
        role: "assistant",
        parts: [{ type: "text", text: reply }],
        actions,
      });
      // Never ask the owner to repeat an operation that already ran just because saving failed.
      const { error: updateError } = await context.supabase
        .from("admin_copilot_threads")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", thread.id);
      return { reply, actions, historySaved: !error && !updateError };
    };

    for (let round = 0; round < 8; round++) {
      let result: Awaited<ReturnType<typeof callMistral>>;
      try {
        result = await callMistral({
          ...provider,
          system: ADMIN_COPILOT_SYSTEM_PROMPT,
          messages,
          tools: adminCopilotToolSpecs,
        });
      } catch {
        return respond(
          "A conexão com a IA foi interrompida. Confira as ações já realizadas antes de repetir uma ordem.",
        );
      }

      if ("error" in result) {
        const status = result.error;
        if ("reason" in result && result.reason === "truncated")
          return respond(
            "O modelo atingiu o limite de resposta antes de terminar. Peça uma tarefa menor. Confira as ações já realizadas antes de repetir.",
          );
        if ("reason" in result && result.reason === "invalid_response")
          return respond(
            "O provedor enviou uma resposta inválida (502). Nenhuma ferramenta dessa resposta foi executada. Confira as ações anteriores da conversa.",
          );
        if (status === 404)
          return respond(
            "Não há um modelo disponível compatível com esta solicitação (404). Confira se o modelo está disponível para sua conta Mistral em Free mode.",
          );
        if (status === 400 || status === 422)
          return respond(
            `O provedor recusou o formato ou tamanho da solicitação (${status}). Tente uma conversa nova com um pedido curto, como listar produtos.`,
          );
        if (status === 401) return respond("A chave de acesso da IA foi recusada.");
        if (status === 402 || status === 403)
          return respond(
            "O serviço de IA está sem créditos ou sem permissão de acesso. Verifique a configuração do provedor selecionado.",
          );
        if (status === 429)
          return respond(
            `O provedor atingiu o limite de uso. ${"retryAfter" in result && result.retryAfter ? `Aguarde cerca de ${result.retryAfter} segundos.` : "Aguarde antes de tentar novamente; a cota pode ser por minuto ou por dia."} Confira as ações já realizadas antes de repetir uma ordem.`,
          );
        return respond(
          `O provedor de IA está indisponível ou falhou (código ${status}). Verifique o histórico e as alterações da loja antes de repetir uma ordem.`,
        );
      }

      if (result.refusal) return respond("A IA recusou esse pedido.");
      const toolUses = result.message.tool_calls ?? [];

      if (toolUses.length) {
        messages.push(result.message);
        const toolResults: import("@/lib/mistral.server").MistralMessage[] = [];
        for (const call of toolUses) {
          let toolResult: unknown;
          try {
            const args = z.record(z.unknown()).parse(JSON.parse(call.function.arguments));
            if (!adminCopilotToolSpecs.some((tool) => tool.function.name === call.function.name)) {
              throw new Error("Ferramenta desconhecida");
            }
            toolResult = await runAdminCopilotTool(call.function.name, args);
            if (!(
              toolResult &&
              typeof toolResult === "object" &&
              "ok" in toolResult &&
              toolResult.ok === false
            )) {
              actions.push(call.function.name);
            }
          } catch (error) {
            toolResult = { erro: error instanceof Error ? error.message : "falha ao executar" };
          }
          toolResults.push({
            role: "tool",
            tool_call_id: call.id,
            content: JSON.stringify(toolResult).slice(0, 8000),
          });
        }
        messages.push(...toolResults);
        continue;
      }

      const text = result.message.content?.trim() ?? "";
      return respond(
        text || "A IA encerrou sem uma resposta em texto. Confira as ações da conversa.",
      );
    }

    return respond(
      "A tarefa ficou longa demais. Confira as ações já realizadas antes de continuar.",
    );
  });

export const getAdminCopilotModels = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (String(context.claims["email"] ?? "").toLowerCase() !== ADMIN_EMAIL)
      throw new Error("Acesso não autorizado");
    const { copilotModelAvailability } = await import("@/lib/copilot-provider.server");
    return copilotModelAvailability(process.env);
  });

export const testAdminCopilotConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (String(context.claims["email"] ?? "").toLowerCase() !== ADMIN_EMAIL)
      throw new Error("Acesso não autorizado");
    const { resolveCopilotProvider } = await import("@/lib/copilot-provider.server");
    let provider;
    try {
      provider = resolveCopilotProvider("mistral-small", process.env);
    } catch {
      return {
        ok: false,
        message: "Configure MISTRAL_API_KEY no servidor usando uma conta em Free mode.",
      };
    }
    try {
      const { testMistralConnection } = await import("@/lib/mistral.server");
      return await testMistralConnection(provider.apiKey);
    } catch {
      return {
        ok: false,
        message: "A conexão com a Mistral falhou ou demorou demais. Nenhum produto foi alterado.",
      };
    }
  });
