import { createPortal } from 'react-dom'
import { useEffect, useId, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { Car, ChevronDown, ChevronRight, Search, X, type LucideIcon } from 'lucide-react'
import { cn, initials, type Tone } from '../lib/utils'
import type { Vehicle } from '../lib/types'

/* ---------- Button ---------- */
type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'whatsapp' | 'outline'
const btnBase =
  'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-[background,color,border,transform,box-shadow] duration-150 active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100 select-none whitespace-nowrap'
const btnVariants: Record<BtnVariant, string> = {
  primary: 'bg-gold-gradient text-black shadow-gold hover:brightness-110',
  secondary: 'bg-surface-3 text-fg border border-line-2 hover:border-gold-500/60 hover:bg-surface-2',
  outline: 'border border-gold-500/50 text-gold-300 hover:bg-gold-500/10',
  ghost: 'text-muted hover:text-fg hover:bg-white/5',
  danger: 'bg-danger/15 text-red-300 border border-danger/30 hover:bg-danger/25',
  whatsapp: 'bg-[#1faa59] text-white hover:bg-[#23bf64]',
}
const btnSizes = { sm: 'h-9 px-3 text-[13px]', md: 'h-11 px-4 text-sm', lg: 'h-12 px-5 text-[15px]', icon: 'h-10 w-10' }

export function Button({
  variant = 'secondary',
  size = 'md',
  icon: Icon,
  className,
  children,
  ...p
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: keyof typeof btnSizes; icon?: LucideIcon }) {
  return (
    <button type="button" className={cn(btnBase, btnVariants[variant], btnSizes[size], className)} {...p}>
      {Icon && <Icon size={size === 'sm' ? 16 : 18} strokeWidth={2.2} />}
      {children}
    </button>
  )
}

/* ---------- Badge ---------- */
const tones: Record<Tone, string> = {
  gold: 'bg-gold-500/12 text-gold-300 ring-gold-500/35',
  blue: 'bg-info/15 text-blue-300 ring-info/40',
  green: 'bg-ok/12 text-green-300 ring-ok/35',
  violet: 'bg-violet/15 text-purple-300 ring-violet/40',
  red: 'bg-danger/12 text-red-300 ring-danger/35',
  gray: 'bg-white/5 text-muted ring-white/10',
}
export const toneText: Record<Tone, string> = {
  gold: 'text-gold-400',
  blue: 'text-blue-400',
  green: 'text-green-400',
  violet: 'text-purple-400',
  red: 'text-red-400',
  gray: 'text-muted',
}
export const toneBg: Record<Tone, string> = {
  gold: 'bg-gold-500',
  blue: 'bg-info',
  green: 'bg-ok',
  violet: 'bg-violet',
  red: 'bg-danger',
  gray: 'bg-subtle',
}

export function Badge({ tone = 'gray', children, className, dot }: { tone?: Tone; children: ReactNode; className?: string; dot?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset whitespace-nowrap', tones[tone], className)}>
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', toneBg[tone])} />}
      {children}
    </span>
  )
}

/* ---------- Card ---------- */
export function Card({
  title,
  action,
  children,
  className,
  bodyClass,
}: {
  title?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
  bodyClass?: string
}) {
  return (
    <section className={cn('card', className)}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 px-4 pt-4 sm:px-5">
          <h2 className="text-[15px] font-semibold tracking-tight sm:text-base">{title}</h2>
          {action}
        </header>
      )}
      <div className={cn('p-4 sm:p-5', (title || action) && 'pt-3 sm:pt-3', bodyClass)}>{children}</div>
    </section>
  )
}

export function LinkAction({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-0.5 text-[13px] font-medium text-gold-400 hover:text-gold-300">
      {children}
      <ChevronRight size={15} />
    </button>
  )
}

/* ---------- Icon tile ---------- */
const tileTones: Record<Tone, string> = {
  gold: 'bg-gradient-to-br from-gold-300 to-gold-600 text-black',
  green: 'bg-gradient-to-br from-emerald-500 to-emerald-700 text-white',
  blue: 'bg-gradient-to-br from-blue-500 to-blue-700 text-white',
  violet: 'bg-gradient-to-br from-purple-500 to-purple-700 text-white',
  red: 'bg-gradient-to-br from-red-500 to-red-700 text-white',
  gray: 'bg-surface-3 text-muted',
}
export function IconTile({ icon: Icon, tone = 'gold', size = 'md' }: { icon: LucideIcon; tone?: Tone; size?: 'sm' | 'md' }) {
  return (
    <span className={cn('grid shrink-0 place-items-center rounded-full shadow-lg', tileTones[tone], size === 'md' ? 'h-11 w-11' : 'h-9 w-9')}>
      <Icon size={size === 'md' ? 21 : 17} strokeWidth={2.2} />
    </span>
  )
}

/* ---------- Avatar / vehicle ---------- */
export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <span
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      className="grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-surface-3 to-surface-2 font-semibold text-gold-300 ring-1 ring-gold-500/30"
    >
      {initials(name)}
    </span>
  )
}

const carColors: Record<string, string> = {
  Preto: '#1a1a1f',
  Branco: '#e8e8ea',
  Prata: '#a8adb4',
  Cinza: '#6b7078',
  Vermelho: '#b3261e',
  Azul: '#1e4fa3',
  Grafite: '#3b3f46',
}
export function VehicleThumb({ v, size = 44 }: { v?: Vehicle; size?: number }) {
  const c = carColors[v?.color ?? ''] ?? '#6b7078'
  return (
    <span
      style={{ width: size * 1.35, height: size, background: `linear-gradient(135deg, ${c}, #0b0b0e 120%)` }}
      className="relative grid shrink-0 place-items-center overflow-hidden rounded-xl ring-1 ring-white/10"
    >
      <Car size={size * 0.55} strokeWidth={1.8} className={c === '#e8e8ea' ? 'text-black/70' : 'text-white/85'} />
      <span className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/40 to-transparent" />
    </span>
  )
}

export function Plate({ plate }: { plate: string }) {
  return (
    <span className="inline-flex items-center rounded-md border border-white/15 bg-white/[0.04] px-1.5 py-px font-mono text-[11px] font-semibold tracking-wider text-fg/90">
      {plate.length === 7 ? `${plate.slice(0, 3)}${plate.slice(3)}` : plate}
    </span>
  )
}

/* ---------- Form fields ---------- */
const fieldCls =
  'w-full h-12 sm:h-11 rounded-xl border border-line-2 bg-ink/60 px-3.5 text-base sm:text-sm text-fg placeholder:text-subtle outline-none transition focus:border-gold-500 focus:ring-4 focus:ring-gold-500/10'

export function Field({ label, hint, children, className }: { label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1.5 flex items-center justify-between text-[12.5px] font-medium text-muted">
        {label}
        {hint}
      </span>
      {children}
    </label>
  )
}
export const Input = ({ className, ...p }: InputHTMLAttributes<HTMLInputElement>) => <input className={cn(fieldCls, className)} {...p} />
export const Select = ({ className, children, ...p }: SelectHTMLAttributes<HTMLSelectElement>) => (
  <div className="relative">
    <select className={cn(fieldCls, 'appearance-none pr-10', className)} {...p}>
      {children}
    </select>
    <ChevronDown size={17} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-gold-400" />
  </div>
)
export const Textarea = ({ className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea className={cn(fieldCls, 'h-auto min-h-[88px] py-3 leading-relaxed', className)} {...p} />
)

export function SearchInput({ value, onChange, placeholder = 'Buscar...' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cn(fieldCls, 'pl-10 pr-10')} type="search" />
      {value && (
        <button aria-label="Limpar busca" onClick={() => onChange('')} className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-subtle hover:text-fg">
          <X size={16} />
        </button>
      )}
    </div>
  )
}

/* ---------- Segmented / chips ---------- */
export function Chips<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string; count?: number }[]
  className?: string
}) {
  return (
    <div className={cn('no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium transition',
            value === o.value ? 'border-gold-500 bg-gold-500 text-black' : 'border-line-2 bg-surface-2 text-muted hover:text-fg',
          )}
        >
          {o.label}
          {o.count !== undefined && (
            <span className={cn('rounded-full px-1.5 text-[11px] tabular-nums', value === o.value ? 'bg-black/15' : 'bg-white/5')}>{o.count}</span>
          )}
        </button>
      ))}
    </div>
  )
}

/* ---------- Page header ---------- */
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3 sm:mb-5">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-[28px]">{title}</h1>
        {subtitle && <p className="mt-0.5 text-[13.5px] text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

/* ---------- Empty ---------- */
export function Empty({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span className="mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-gold-500/10 text-gold-400 ring-1 ring-gold-500/20">
        <Icon size={26} />
      </span>
      <p className="font-semibold">{title}</p>
      {text && <p className="mt-1 max-w-xs text-sm text-muted">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

/* ---------- Sheet (bottom-sheet no celular / modal no desktop) ---------- */
export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  subtitle?: ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}) {
  const id = useId()
  const panel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      const dialogs = document.querySelectorAll('[data-sheet]')
      if (dialogs[dialogs.length - 1] === panel.current) onClose()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])
  if (!open) return null
  const w = { sm: 'sm:max-w-md', md: 'sm:max-w-xl', lg: 'sm:max-w-3xl' }[size]
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby={id}>
      <div className="absolute inset-0 animate-fade-in bg-black/70 backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={panel}
        data-sheet
        className={cn(
          'relative flex max-h-[88dvh] w-full animate-slide-up flex-col rounded-t-3xl border border-line-2 bg-surface sm:max-h-[88dvh] sm:animate-pop sm:rounded-3xl',
          w,
        )}
      >
        <div className="mx-auto mt-2.5 h-1.5 w-11 rounded-full bg-white/15 sm:hidden" />
        <header className="flex items-start justify-between gap-3 px-5 pb-3 pt-3 sm:pt-5">
          <div className="min-w-0">
            <h2 id={id} className="text-lg font-semibold tracking-tight">
              {title}
            </h2>
            {subtitle && <div className="mt-0.5 text-[13px] text-muted">{subtitle}</div>}
          </div>
          <button onClick={onClose} aria-label="Fechar" className="-mr-2 grid h-10 w-10 shrink-0 place-items-center rounded-xl text-muted hover:bg-white/5 hover:text-fg">
            <X size={20} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-5">{children}</div>
        {footer && <footer className="pb-safe flex gap-2 border-t border-line bg-surface/95 px-5 py-3.5 sm:rounded-b-3xl [&>*]:flex-1 sm:[&>*]:flex-none sm:justify-end">{footer}</footer>}
      </div>
    </div>,
    document.body,
  )
}

/* ---------- List row ---------- */
export function Row({ children, onClick, className }: { children: ReactNode; onClick?: () => void; className?: string }) {
  const Comp = onClick ? 'button' : 'div'
  return (
    <Comp
      onClick={onClick}
      className={cn('flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition', onClick && 'hover:bg-white/[0.03] active:bg-white/[0.05]', className)}
    >
      {children}
    </Comp>
  )
}

export function Stat({ label, value, tone, sub }: { label: string; value: ReactNode; tone?: Tone; sub?: ReactNode }) {
  return (
    <div className="card min-w-0 p-4">
      <p className="truncate text-[12.5px] text-muted">{label}</p>
      <p className={cn('mt-1 truncate font-display text-xl font-semibold tabular-nums sm:text-2xl', tone && toneText[tone])}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-subtle">{sub}</p>}
    </div>
  )
}
