import { cn } from '../lib/utils'

/** Logo em código (SVG + texto) — nítido em qualquer tela e sem peso de imagem */
export function Logo({ compact, className }: { compact?: boolean; className?: string }) {
  if (compact)
    return (
      <div className={cn('flex items-center gap-2.5', className)}>
        <img src="/favicon.svg" alt="" className="h-9 w-9" />
        <div className="leading-none">
          <div className="font-display text-[22px] font-extrabold italic tracking-tight text-gold-gradient">JAT WASH</div>
          <div className="mt-0.5 text-[8.5px] font-semibold uppercase tracking-[0.18em] text-fg/80">Lava Rápido</div>
        </div>
      </div>
    )
  return (
    <div className={cn('relative select-none text-center leading-none', className)}>
      <svg viewBox="0 0 220 40" className="mx-auto -mb-2 h-7 w-[82%]" aria-hidden>
        <defs>
          <linearGradient id="lg-swoosh" x1="0" x2="1">
            <stop offset="0" stopColor="#f5b81c" stopOpacity="0" />
            <stop offset=".35" stopColor="#ffd35a" />
            <stop offset=".75" stopColor="#f5b81c" />
            <stop offset="1" stopColor="#f5b81c" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M6 36 C40 14 80 6 118 6 C150 6 178 14 214 30" fill="none" stroke="url(#lg-swoosh)" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M40 34 C70 22 100 17 130 17 C160 17 182 23 200 31" fill="none" stroke="url(#lg-swoosh)" strokeWidth="1.2" opacity=".6" />
      </svg>
      <div className="font-display text-[40px] font-extrabold italic tracking-tight text-gold-gradient drop-shadow-[0_2px_10px_rgba(245,184,28,0.25)]">JAT WASH</div>
      <div className="mt-1 flex items-center justify-center gap-1.5 whitespace-nowrap">
        <span className="h-px w-4 bg-gradient-to-r from-transparent to-gold-500" />
        <span className="font-display text-[13px] font-bold italic tracking-[0.18em] text-gold-400">LAVA RÁPIDO</span>
        <span className="h-px w-4 bg-gradient-to-l from-transparent to-gold-500" />
      </div>
    </div>
  )
}
