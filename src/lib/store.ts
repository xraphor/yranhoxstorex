export const ADMIN_EMAIL = "raphael900001@gmail.com";

export const CATEGORIES = ["Jogos", "Contas", "Keys", "Scripts", "Métodos"] as const;
export type Category = (typeof CATEGORIES)[number];

export const ACCENTS = [
  { id: "purple", label: "Roxo Neon", swatch: "#8b5cf6" },
  { id: "cyan", label: "Ciano Cyber", swatch: "#06b6d4" },
  { id: "emerald", label: "Verde Esmeralda", swatch: "#10b981" },
  { id: "orange", label: "Laranja Vulcão", swatch: "#f97316" },
] as const;
export type AccentId = (typeof ACCENTS)[number]["id"];
export const ACCENT_STORAGE_KEY = "yranhox-accent";

export function applyAccent(accent: AccentId) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-accent", accent);
}

export function formatBRL(cents: number | null | undefined) {
  return ((cents ?? 0) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function discountPercent(price: number, original?: number | null) {
  if (!original || original <= price) return null;
  return Math.round(((original - price) / original) * 100);
}

export const ORDER_STATUS: Record<string, { label: string; className: string }> = {
  pending: { label: "Aguardando Pix", className: "bg-warning/15 text-warning border-warning/30" },
  awaiting_confirmation: {
    label: "Em análise",
    className: "bg-primary/15 text-primary border-primary/30",
  },
  paid: { label: "Pago / Entregue", className: "bg-success/15 text-success border-success/30" },
  cancelled: {
    label: "Cancelado",
    className: "bg-destructive/15 text-destructive border-destructive/30",
  },
};

export function isAdminEmail(email?: string | null) {
  return (email ?? "").toLowerCase() === ADMIN_EMAIL;
}
