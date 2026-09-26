import logo3d from "@/assets/yranhox-logo-3d.png";

export function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className={`${compact ? "size-10" : "size-14"} relative grid shrink-0 place-items-center`}>
        <span className="absolute inset-1 rounded-full bg-primary/20 blur-md" aria-hidden="true" />
        <img
          src={logo3d}
          alt=""
          width={1024}
          height={1024}
          className="relative size-full object-contain drop-shadow-[0_0_12px_oklch(from_var(--primary)_l_c_h/0.55)]"
        />
      </span>
      <span className={`font-display leading-tight font-black ${compact ? "text-sm sm:text-base" : "text-lg"}`}>
        yRanhox <span className="text-primary text-glow">Store X</span>
      </span>
    </span>
  );
}