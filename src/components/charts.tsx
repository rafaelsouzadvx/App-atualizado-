import { useState } from 'react'
import { cn, money } from '../lib/utils'

/** Barras verticais em SVG/HTML puro — leve e responsivo */
export function BarChart({ data, height = 210, highlightLast = true }: { data: { label: string; value: number; sub?: string }[]; height?: number; highlightLast?: boolean }) {
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(1, ...data.map((d) => d.value))
  const step = niceStep(max)
  const top = Math.ceil(max / step) * step || step
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step).reverse()
  const dense = data.length > 10
  const every = Math.ceil(data.length / 6)
  return (
    <div className="flex gap-2 sm:gap-3" style={{ height }}>
      <div className="flex flex-col justify-between pb-6 text-right text-[10.5px] tabular-nums text-subtle sm:text-[11.5px]">
        {ticks.map((t) => (
          <span key={t} className="-translate-y-1/2 leading-none">
            {t >= 1000 ? `${(t / 1000).toLocaleString('pt-BR')}k` : t}
          </span>
        ))}
      </div>
      <div className="relative flex-1">
        <div className="absolute inset-x-0 bottom-6 top-0 flex flex-col justify-between">
          {ticks.map((t) => (
            <div key={t} className="border-t border-dashed border-white/[0.06]" />
          ))}
        </div>
        <div className={cn('absolute inset-x-0 bottom-0 top-0 flex items-end', dense ? 'gap-[3px] sm:gap-1' : 'gap-2 sm:gap-4')}>
          {data.map((d, i) => {
            const h = (d.value / top) * 100
            const active = hover === i || (hover === null && highlightLast && i === data.length - 1)
            return (
              <div
                key={i}
                className="group relative flex h-full flex-1 flex-col items-center justify-end pb-6"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onTouchStart={() => setHover(i)}
              >
                {!dense && (
                  <span className={cn('mb-1 whitespace-nowrap text-[10px] font-semibold tabular-nums transition sm:text-[11.5px]', active ? 'text-gold-200' : 'text-fg/70')}>
                    {d.value >= 1000 ? `${(d.value / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}k` : d.value.toLocaleString('pt-BR')}
                  </span>
                )}
                {dense && hover === i && (
                  <span className="absolute -top-2 z-10 -translate-y-full whitespace-nowrap rounded-lg border border-line-2 bg-surface-2 px-2 py-1 text-[11px] font-semibold shadow-xl">
                    {d.label}: {money(d.value)}
                  </span>
                )}
                <div
                  className={cn('w-full max-w-[46px] rounded-t-md transition-[height,filter] duration-500 ease-out', active ? 'brightness-110' : 'brightness-[0.85]')}
                  style={{
                    height: `${Math.max(h, d.value ? 2 : 0)}%`,
                    background: 'linear-gradient(180deg, #ffd35a 0%, #f5b81c 45%, #b87908 100%)',
                    boxShadow: active ? '0 0 22px -4px rgba(245,184,28,.6)' : undefined,
                  }}
                />
                <span className={cn('absolute bottom-0 h-5 whitespace-nowrap pt-1 text-[10.5px] tabular-nums sm:text-[11.5px]', active ? 'text-fg' : 'text-muted', dense && i % every !== 0 && 'hidden')}>
                  {d.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function niceStep(max: number) {
  const raw = max / 5
  const mag = 10 ** Math.floor(Math.log10(raw || 1))
  const n = raw / mag
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag
}

export function Ring({ value, size = 170, stroke = 18, children }: { value: number; size?: number; stroke?: number; children?: React.ReactNode }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const v = Math.max(0, Math.min(1, value))
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="ring-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffd35a" />
            <stop offset="1" stopColor="#e0a010" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#222229" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#ring-g)"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.2,.8,.2,1)', filter: 'drop-shadow(0 0 8px rgba(245,184,28,.35))' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  )
}

const DONUT_COLORS = ['#f5b81c', '#3b82f6', '#22c55e', '#a855f7', '#ef4444', '#94a3b8']
export function Donut({ data, size = 150 }: { data: { label: string; value: number }[]; size?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1
  const stroke = 22
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  let acc = 0
  return (
    <div className="flex flex-wrap items-center gap-5">
      <svg width={size} height={size} className="-rotate-90 shrink-0">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#1e1e26" strokeWidth={stroke} fill="none" />
        {data.map((d, i) => {
          const len = (d.value / total) * c
          const el = (
            <circle
              key={d.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke={DONUT_COLORS[i % DONUT_COLORS.length]}
              strokeWidth={stroke}
              fill="none"
              strokeDasharray={`${Math.max(0, len - 2)} ${c}`}
              strokeDashoffset={-acc}
            />
          )
          acc += len
          return el
        })}
      </svg>
      <ul className="min-w-[140px] flex-1 space-y-2 text-sm">
        {data.map((d, i) => (
          <li key={d.label} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
            <span className="flex-1 truncate text-muted">{d.label}</span>
            <span className="font-semibold tabular-nums">{Math.round((d.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function HBars({ data, format = money }: { data: { label: string; value: number; sub?: string }[]; format?: (n: number) => string }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <ul className="space-y-3.5">
      {data.map((d) => (
        <li key={d.label}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate">
              {d.label}
              {d.sub && <span className="ml-1.5 text-xs text-subtle">{d.sub}</span>}
            </span>
            <span className="shrink-0 font-semibold tabular-nums">{format(d.value)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-3">
            <div className="h-full rounded-full bg-gold-gradient transition-[width] duration-700" style={{ width: `${(d.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}
