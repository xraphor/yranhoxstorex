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

export const THEME_SEEN_KEY = "yranhox-theme-seen";

export function applyAccent(accent: AccentId) {
  if (typeof document === "undefined") return;
  applyCustomTheme(null);
  document.documentElement.setAttribute("data-accent", accent);
}

// Tema totalmente personalizado criado pela IA do painel (cores em hex).
export type CustomTheme = {
  name?: string;
  primary: string;
  background: string;
  card: string;
  border?: string;
  foreground?: string;
};

const CUSTOM_VARS = [
  "--primary",
  "--primary-foreground",
  "--ring",
  "--accent",
  "--background",
  "--surface",
  "--surface-2",
  "--card",
  "--popover",
  "--secondary",
  "--muted",
  "--border",
  "--input",
  "--foreground",
  "--card-foreground",
  "--popover-foreground",
  "--secondary-foreground",
  "--bolt-hue",
];

const HEX = /^#[0-9a-fA-F]{6}$/;
export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && HEX.test(value);
}

function hexToRgb(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
}

function hexHue(hex: string) {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255) as [number, number, number];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return 0;
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60;
  return h < 0 ? h + 360 : h;
}

function isLight(hex: string) {
  const [r, g, b] = hexToRgb(hex);
  return 0.299 * r + 0.587 * g + 0.114 * b > 150;
}

export function applyCustomTheme(theme: CustomTheme | null) {
  if (typeof document === "undefined") return;
  const style = document.documentElement.style;
  if (!theme || !isHexColor(theme.primary) || !isHexColor(theme.background) || !isHexColor(theme.card)) {
    for (const v of CUSTOM_VARS) style.removeProperty(v);
    return;
  }
  const border = isHexColor(theme.border)
    ? theme.border
    : `color-mix(in oklch, ${theme.card}, ${theme.primary} 18%)`;
  const fg = isHexColor(theme.foreground) ? theme.foreground : isLight(theme.background) ? "#111318" : "#f4f5f8";
  const set = (k: string, v: string) => style.setProperty(k, v);
  set("--primary", theme.primary);
  set("--primary-foreground", isLight(theme.primary) ? "#111318" : "#ffffff");
  set("--ring", theme.primary);
  set("--accent", `color-mix(in oklch, ${theme.card}, ${theme.primary} 22%)`);
  set("--background", theme.background);
  set("--surface", theme.card);
  set("--surface-2", `color-mix(in oklch, ${theme.card}, ${fg} 7%)`);
  set("--card", theme.card);
  set("--popover", theme.card);
  set("--secondary", `color-mix(in oklch, ${theme.card}, ${fg} 6%)`);
  set("--muted", `color-mix(in oklch, ${theme.card}, ${fg} 6%)`);
  set("--border", border);
  set("--input", border);
  set("--foreground", fg);
  set("--card-foreground", fg);
  set("--popover-foreground", fg);
  set("--secondary-foreground", fg);
  set("--bolt-hue", `${Math.round((hexHue(theme.primary) - 50 + 360) % 360)}deg`);
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
