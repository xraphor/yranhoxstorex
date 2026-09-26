import { useEffect, useState } from "react";
import { Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ACCENTS, ACCENT_STORAGE_KEY, applyAccent, type AccentId } from "@/lib/store";

export function AccentPicker() {
  const [accent, setAccent] = useState<AccentId>("purple");

  useEffect(() => {
    const stored = localStorage.getItem(ACCENT_STORAGE_KEY) as AccentId | null;
    if (stored && ACCENTS.some((a) => a.id === stored)) {
      setAccent(stored);
      applyAccent(stored);
    }
  }, []);

  function pick(id: AccentId) {
    setAccent(id);
    applyAccent(id);
    localStorage.setItem(ACCENT_STORAGE_KEY, id);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Alterar cor de destaque">
          <Palette className="size-4 text-primary" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Tema de destaque</DropdownMenuLabel>
        {ACCENTS.map((a) => (
          <DropdownMenuItem key={a.id} onClick={() => pick(a.id)} className="gap-2">
            <span
              className="size-4 rounded-full border border-border"
              style={{ backgroundColor: a.swatch }}
            />
            <span className={accent === a.id ? "font-semibold text-primary" : ""}>{a.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
