import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
  return (
    <div className="flex min-h-screen flex-col">
      <Header notice={settings?.top_notice ?? null} />
      <main className="flex-1">{children}</main>
      <Footer support={settings?.support_link ?? null} />
    </div>
  );
}
