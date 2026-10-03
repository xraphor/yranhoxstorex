CREATE TABLE public.admin_copilot_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL DEFAULT 'Nova conversa',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_copilot_threads TO authenticated;
GRANT ALL ON public.admin_copilot_threads TO service_role;
ALTER TABLE public.admin_copilot_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "copilot_threads_admin_only" ON public.admin_copilot_threads
FOR ALL TO authenticated
USING (public.is_store_admin() AND user_id = auth.uid())
WITH CHECK (public.is_store_admin() AND user_id = auth.uid());

CREATE TABLE public.admin_copilot_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.admin_copilot_threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  role text NOT NULL,
  parts jsonb NOT NULL DEFAULT '[]'::jsonb,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_copilot_messages_role_valid CHECK (role IN ('user', 'assistant'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_copilot_messages TO authenticated;
GRANT ALL ON public.admin_copilot_messages TO service_role;
ALTER TABLE public.admin_copilot_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "copilot_messages_admin_only" ON public.admin_copilot_messages
FOR ALL TO authenticated
USING (
  public.is_store_admin()
  AND user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.admin_copilot_threads t
    WHERE t.id = thread_id AND t.user_id = auth.uid()
  )
)
WITH CHECK (
  public.is_store_admin()
  AND user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.admin_copilot_threads t
    WHERE t.id = thread_id AND t.user_id = auth.uid()
  )
);
CREATE INDEX admin_copilot_messages_thread_created_idx
ON public.admin_copilot_messages(thread_id, created_at);

CREATE TABLE public.admin_copilot_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  category text NOT NULL DEFAULT 'geral',
  content text NOT NULL,
  importance integer NOT NULL DEFAULT 3,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_copilot_memories_importance_valid CHECK (importance BETWEEN 1 AND 5)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_copilot_memories TO authenticated;
GRANT ALL ON public.admin_copilot_memories TO service_role;
ALTER TABLE public.admin_copilot_memories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "copilot_memories_admin_only" ON public.admin_copilot_memories
FOR ALL TO authenticated
USING (public.is_store_admin() AND user_id = auth.uid())
WITH CHECK (public.is_store_admin() AND user_id = auth.uid());
CREATE INDEX admin_copilot_memories_user_updated_idx
ON public.admin_copilot_memories(user_id, updated_at DESC);

CREATE TRIGGER trg_admin_copilot_threads_updated
BEFORE UPDATE ON public.admin_copilot_threads
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_admin_copilot_memories_updated
BEFORE UPDATE ON public.admin_copilot_memories
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();