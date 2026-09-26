import bolt3d from "@/assets/yranhox-bolt-3d.png";

export function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className={`${compact ? "size-10" : "size-14"} relative grid shrink-0 place-items-center`}>
        <span className="absolute inset-[18%] bg-primary/70 blur-xl" aria-hidden="true" />
        <img
          src={bolt3d}
          alt="Raio yRanhox Store X"
          width={1024}
          height={1024}
          className="brand-bolt relative size-full object-contain"
        />
      </span>
      <span className={`font-display leading-tight font-black ${compact ? "text-sm sm:text-base" : "text-lg"}`}>
        yRanhox <span className="text-primary text-glow">Store X</span>
      </span>
    </span>
  );
}