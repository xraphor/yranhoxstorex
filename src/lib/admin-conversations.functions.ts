import { createServerFn } from "@tanstack/react-start";
import { createMiddleware } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ADMIN_EMAIL } from "@/lib/store";
import { readConversationMessage } from "@/lib/admin-conversation";

const requireStoreAdmin = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ context, next }) => {
    if (String(context.claims["email"] ?? "").toLowerCase() !== ADMIN_EMAIL) {
      throw new Error("Acesso não autorizado");
    }
    return next();
  });

const ThreadInput = z.object({ threadId: z.string().uuid() });

export const listAdminConversations = createServerFn({ method: "GET" })
  .middleware([requireStoreAdmin])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("admin_copilot_threads")
      .select("id, title, updated_at")
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false });
    if (error) throw new Error("Não foi possível carregar as conversas");
    return data ?? [];
  });

export const createAdminConversation = createServerFn({ method: "POST" })
  .middleware([requireStoreAdmin])
  .inputValidator((data: unknown) =>
    z.object({ title: z.string().trim().min(1).max(80) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: thread, error } = await context.supabase
      .from("admin_copilot_threads")
      .insert({ title: data.title, user_id: context.userId })
      .select("id, title, updated_at")
      .single();
    if (error) throw new Error("Não foi possível criar a conversa");
    return thread;
  });

export const getAdminConversation = createServerFn({ method: "GET" })
  .middleware([requireStoreAdmin])
  .inputValidator((data: unknown) => ThreadInput.parse(data))
  .handler(async ({ data, context }) => {
    const { data: thread, error: threadError } = await context.supabase
      .from("admin_copilot_threads")
      .select("id")
      .eq("id", data.threadId)
      .eq("user_id", context.userId)
      .single();
    if (threadError || !thread) throw new Error("Conversa não encontrada");
    const { data: messages, error } = await context.supabase
      .from("admin_copilot_messages")
      .select("id, role, parts, actions, created_at")
      .eq("thread_id", thread.id)
      .order("created_at", { ascending: true });
    if (error) throw new Error("Não foi possível carregar o histórico");
    return (messages ?? []).flatMap((message) => {
      const parsed = readConversationMessage(message);
      return parsed ? [{ id: message.id, ...parsed }] : [];
    });
  });
