import { useEffect, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ACCENTS,
  ACCENT_STORAGE_KEY,
  THEME_SEEN_KEY,
  applyAccent,
  applyCustomTheme,
  type AccentId,
  type CustomTheme,
} from "@/lib/store";
import { Header } from "./Header";
import { Footer } from "./Footer";

export function useStoreSettings() {
  return useQuery({
    queryKey: ["store_settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("store_settings").select("*").eq("id", 1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function StoreShell({ children }: { children: ReactNode }) {
  const { data: settings } = useStoreSettings();

  // Aplica o tema publicado pelo dono para todos os visitantes.
  // Quando o dono publica um tema novo, ele substitui qualquer cor escolhida antes no seletor.
  useEffect(() => {
    if (!settings) return;
    const custom = settings.custom_theme as CustomTheme | null;
    const isCustom = settings.accent === "custom" && custom;
    const key = isCustom ? `custom:${JSON.stringify(custom)}` : settings.accent;

    if (localStorage.getItem(THEME_SEEN_KEY) !== key) {
      localStorage.removeItem(ACCENT_STORAGE_KEY);
      localStorage.setItem(THEME_SEEN_KEY, key);
    }
    if (localStorage.getItem(ACCENT_STORAGE_KEY)) return;

    if (isCustom) {
      document.documentElement.setAttribute("data-accent", "purple");
      applyCustomTheme(custom);
      return;
    }
    const accent = settings.accent as AccentId;
    if (ACCENTS.some((a) => a.id === accent)) applyAccent(accent);
  }, [settings]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header notice={settings?.top_notice ?? null} />
      <main className="flex-1">{children}</main>
      <Footer support={settings?.support_link ?? null} />
    </div>
  );
}
