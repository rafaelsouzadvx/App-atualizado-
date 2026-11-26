import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  CalendarDays,
  CalendarPlus,
  Car,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  FilePlus2,
  Info,
  LayoutGrid,
  MessageCircle,
  Plus,
  RotateCcw,
  Search,
  Settings,
  UserPlus,
  AlertCircle,
  Clock3,
  FileText,
  Home,
  Zap,
} from 'lucide-react'
import { navigate, useRoute, type Route } from '../lib/router'
import type { PayMethod } from '../lib/types'
import { cn, fmtPlate, money, normalize, orderTitle, todayISO, uid } from '../lib/utils'
import { useDB } from '../store/data'
import { confirmDialog, openForm, toast, useUI } from '../store/ui'
import { NAV } from './nav'
import { Logo } from './Logo'
import { Avatar, Badge, Button, Sheet, VehicleThumb } from './ui'
import { STATUS } from '../lib/utils'

export function useNow(ms = 15000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), ms)
    return () => clearInterval(t)
  }, [ms])
  return now
}

/* ---------------- Sidebar (desktop) ---------------- */
function Sidebar() {
  const route = useRoute()
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-gold-500/10 bg-black/60 lg:flex">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-gold-500/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-10 h-64 w-72 rotate-12 bg-gradient-to-tr from-gold-500/10 to-transparent blur-2xl" />
      </div>
      <button onClick={() => navigate('dashboard')} className="relative px-5 pb-6 pt-5" aria-label="Início">
        <Logo />
      </button>
      <nav className="relative flex-1 space-y-0.5 overflow-y-auto px-3">
        {NAV.map((n) => {
          const active = route === n.route
          return (
            <button
              key={n.route}
              onClick={() => navigate(n.route)}
              className={cn(
                'group flex h-11 w-full items-center gap-3.5 rounded-xl px-3.5 text-[14.5px] transition',
                active ? 'bg-gold-gradient font-semibold text-black shadow-gold' : 'text-fg/85 hover:bg-white/[0.04] hover:text-white',
              )}
            >
              <n.icon size={20} strokeWidth={active ? 2.4 : 2} className={active ? '' : 'text-gold-400 transition group-hover:scale-110'} />
              {n.label}
            </button>
          )
        })}
      </nav>
      <div className="relative px-5 pb-5 pt-4">
        <p className="font-display text-[15px] font-semibold italic leading-snug text-fg/90">
          Mais que uma lavagem,
          <br />
          <span className="text-gold-gradient">é cuidado com seu veículo!</span>
        </p>
        <div className="mt-4 flex items-center gap-2 text-xs text-muted">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ok opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-ok" />
          </span>
          Sistema online · v1.0
        </div>
      </div>
    </aside>
  )
}

/* ---------------- Topbar ---------------- */
function UserMenu() {
  const [open, setOpen] = useState(false)
  const owner = useDB((s) => s.settings.ownerName)
  const resetDemo = useDB((s) => s.resetDemo)
  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-3 rounded-2xl px-2 py-1.5 hover:bg-white/[0.04]" aria-haspopup="menu" aria-expanded={open}>
        <Avatar name={owner} size={42} />
        <div className="hidden text-left leading-tight xl:block">
          <div className="font-semibold">{owner}</div>
          <div className="text-xs text-muted">Administrador</div>
        </div>
        <ChevronDown size={16} className={cn('hidden text-muted transition xl:block', open && 'rotate-180')} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-60 animate-pop rounded-2xl border border-line-2 bg-surface-2 p-1.5 shadow-2xl">
            <MenuItem icon={Settings} onClick={() => (setOpen(false), navigate('config'))}>
              Configurações
            </MenuItem>
            <MenuItem
              icon={RotateCcw}
              onClick={async () => {
                setOpen(false)
                if (await confirmDialog({ title: 'Restaurar demonstração?', message: 'Os dados de exemplo serão recarregados e as alterações feitas serão perdidas.', confirmLabel: 'Restaurar' })) {
                  resetDemo()
                  toast('Dados de demonstração restaurados')
                }
              }}
            >
              Restaurar dados demo
            </MenuItem>
          </div>
        </>
      )}
    </div>
  )
}
function MenuItem({ icon: Icon, children, onClick }: { icon: typeof Settings; children: ReactNode; onClick: () => void }) {
  return (
    <button role="menuitem" onClick={onClick} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-fg/90 hover:bg-white/5">
      <Icon size={17} className="text-gold-400" />
      {children}
    </button>
  )
}

function DesktopTopbar() {
  const now = useNow()
  const owner = useDB((s) => s.settings.ownerName)
  const setSearchOpen = useUI((s) => s.setSearchOpen)
  const route = useRoute()
  const title = NAV.find((n) => n.route === route)?.label
  const dateStr = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const [wd, rest] = [dateStr.split(',')[0], dateStr.split(',').slice(1).join(',').trim()]
  return (
    <header className="card relative mb-5 hidden items-center gap-4 overflow-hidden px-6 py-4 lg:flex">
      <HeaderGlow />
      <div className="relative min-w-0 flex-1">
        <p className="text-2xl font-bold tracking-tight">Olá, {owner}!</p>
        <p className="text-[14.5px] text-muted">{route === 'dashboard' ? 'Aqui está um resumo do seu negócio hoje.' : `Você está em ${title}`}</p>
      </div>
      <button
        onClick={() => setSearchOpen(true)}
        className="relative hidden h-11 w-64 items-center gap-2.5 rounded-xl border border-line-2 bg-ink/60 px-3.5 text-sm text-subtle transition hover:border-gold-500/50 xl:flex"
      >
        <Search size={17} className="shrink-0" />
        <span className="truncate">Buscar cliente, placa…</span>
        <kbd className="ml-auto shrink-0 whitespace-nowrap rounded-md border border-line-2 px-1.5 text-[11px]">Ctrl K</kbd>
      </button>
      <Button variant="ghost" size="icon" icon={Search} className="relative xl:hidden" aria-label="Buscar" onClick={() => setSearchOpen(true)} />
      <div className="relative flex items-center gap-3 border-l border-line pl-5 text-sm">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <CalendarDays size={18} className="text-gold-400" />
            <span className="leading-tight">
              <span className="block capitalize">{wd}</span>
              <span className="block text-xs text-muted">{rest}</span>
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <Clock3 size={18} className="text-gold-400" />
            <span className="tabular-nums">{now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
      </div>
      <div className="relative border-l border-line pl-3">
        <UserMenu />
      </div>
    </header>
  )
}

function HeaderGlow() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      <div className="absolute -right-10 -top-24 h-56 w-[420px] rounded-full bg-gold-500/10 blur-3xl" />
      <svg className="absolute right-[34%] top-0 h-full w-72 opacity-40" viewBox="0 0 300 100" preserveAspectRatio="none">
        <path d="M0 90 L120 10 L300 0" stroke="#f5b81c" strokeWidth=".6" fill="none" />
        <path d="M30 100 L160 18 L300 12" stroke="#f5b81c" strokeWidth=".4" fill="none" />
      </svg>
    </div>
  )
}

/* ---------------- Mobile header ---------------- */
function MobileHeader() {
  const setSearchOpen = useUI((s) => s.setSearchOpen)
  const owner = useDB((s) => s.settings.ownerName)
  return (
    <header className="pt-safe sticky top-0 z-30 border-b border-white/5 bg-ink/85 backdrop-blur-xl lg:hidden">
      <div className="flex h-16 items-center justify-between px-4">
        <button onClick={() => navigate('dashboard')} aria-label="Início">
          <Logo compact />
        </button>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" icon={Search} aria-label="Buscar" onClick={() => setSearchOpen(true)} />
          <button onClick={() => navigate('config')} aria-label="Perfil">
            <Avatar name={owner} size={36} />
          </button>
        </div>
      </div>
    </header>
  )
}

/* ---------------- Bottom nav (mobile) ---------------- */
function BottomNav() {
  const route = useRoute()
  const setQuickOpen = useUI((s) => s.setQuickOpen)
  const setMoreOpen = useUI((s) => s.setMoreOpen)
  const moreOpen = useUI((s) => s.moreOpen)
  const items: { route: Route; label: string; icon: typeof Home }[] = [
    { route: 'dashboard', label: 'Início', icon: Home },
    { route: 'agenda', label: 'Agenda', icon: CalendarDays },
  ]
  const items2: { route: Route; label: string; icon: typeof Home }[] = [{ route: 'os', label: 'OS', icon: FileText }]
  const inMain = ['dashboard', 'agenda', 'os'].includes(route)
  const Item = ({ r, label, icon: Icon }: { r: Route; label: string; icon: typeof Home }) => {
    const active = route === r && !moreOpen
    return (
      <button onClick={() => navigate(r)} className="flex flex-1 flex-col items-center justify-center gap-1 pt-1" aria-current={active ? 'page' : undefined}>
        <Icon size={23} strokeWidth={active ? 2.4 : 1.9} className={active ? 'text-gold-400' : 'text-muted'} />
        <span className={cn('text-[11px]', active ? 'font-semibold text-gold-300' : 'text-muted')}>{label}</span>
      </button>
    )
  }
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.06] bg-[#0b0b0e]/95 backdrop-blur-xl lg:hidden">
      <div className="mx-auto flex h-16 max-w-md items-stretch px-2">
        {items.map((i) => (
          <Item key={i.route} r={i.route} label={i.label} icon={i.icon} />
        ))}
        <div className="flex flex-1 justify-center">
          <button
            onClick={() => setQuickOpen(true)}
            aria-label="Ações rápidas"
            className="-mt-5 grid h-[58px] w-[58px] place-items-center rounded-2xl bg-gold-gradient text-black shadow-gold ring-4 ring-ink transition active:scale-95"
          >
            <Plus size={28} strokeWidth={2.6} />
          </button>
        </div>
        {items2.map((i) => (
          <Item key={i.route} r={i.route} label={i.label} icon={i.icon} />
        ))}
        <button onClick={() => setMoreOpen(true)} className="flex flex-1 flex-col items-center justify-center gap-1 pt-1">
          <LayoutGrid size={23} strokeWidth={!inMain || moreOpen ? 2.4 : 1.9} className={!inMain || moreOpen ? 'text-gold-400' : 'text-muted'} />
          <span className={cn('text-[11px]', !inMain || moreOpen ? 'font-semibold text-gold-300' : 'text-muted')}>Menu</span>
        </button>
      </div>
    </nav>
  )
}

/* ---------------- Sheets globais ---------------- */
export const QUICK_ACTIONS = [
  { label: 'Novo Cliente', icon: UserPlus, run: () => openForm({ kind: 'client' }) },
  { label: 'Novo Veículo', icon: Car, run: () => openForm({ kind: 'vehicle' }) },
  { label: 'Agendar Serviço', icon: CalendarPlus, run: () => openForm({ kind: 'order' }) },
  { label: 'Novo Orçamento', icon: FilePlus2, run: () => openForm({ kind: 'quote' }) },
  { label: 'Registrar OS', icon: ClipboardList, run: () => openForm({ kind: 'order', preset: { now: true } }) },
  { label: 'Enviar WhatsApp', icon: MessageCircle, run: () => (useUI.getState().setQuickOpen(false), navigate('whatsapp')), wa: true },
]

export function QuickGrid() {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      <button
        onClick={() => useUI.getState().setSaleOpen(true)}
        className="col-span-2 flex h-16 items-center justify-center gap-3 rounded-2xl bg-gold-gradient text-[16px] font-bold text-black shadow-gold transition active:scale-[0.98]"
      >
        <Zap size={24} strokeWidth={2.4} />
        Venda rápida
      </button>
      {QUICK_ACTIONS.map((a) => (
        <button
          key={a.label}
          onClick={a.run}
          className="group flex flex-col items-center justify-center gap-2 rounded-2xl border border-line-2 bg-ink/40 px-2 py-4 text-[13.5px] font-medium transition hover:-translate-y-0.5 hover:border-gold-500/60 hover:bg-gold-500/[0.04] active:scale-[0.98]"
        >
          <a.icon size={28} strokeWidth={1.9} className={a.wa ? 'text-[#25d366]' : 'text-gold-400'} />
          {a.label}
        </button>
      ))}
    </div>
  )
}

const SALE_METHODS: PayMethod[] = ['Pix', 'Dinheiro', 'Crédito', 'Débito']

/** Registra uma venda em dois toques: valor + forma de pagamento. */
function QuickSaleSheet() {
  const open = useUI((s) => s.saleOpen)
  const setOpen = useUI((s) => s.setSaleOpen)
  const upsert = useDB((s) => s.upsert)
  const services = useDB((s) => s.services)
  const [amount, setAmount] = useState('')
  const [desc, setDesc] = useState('Lavagem')

  useEffect(() => {
    if (!open) {
      setAmount('')
      setDesc('Lavagem')
    }
  }, [open])

  const chips = useMemo(() => {
    const seen = new Set<string>()
    const list: { name: string; price: number }[] = []
    services
      .filter((s) => s.active)
      .forEach((s) => {
        const name = s.name.trim()
        if (seen.has(name)) return
        seen.add(name)
        list.push({ name, price: s.price })
      })
    return list.slice(0, 8)
  }, [services])

  const value = parseFloat(amount.replace(',', '.')) || 0

  const save = (method: PayMethod) => {
    if (!value) {
      toast('Informe o valor da venda', 'error')
      return
    }
    upsert('transactions', {
      id: uid(),
      type: 'in',
      category: 'Serviços',
      description: desc.trim() || 'Venda',
      amount: Math.round(value * 100) / 100,
      date: todayISO(),
      status: 'pago',
      method,
    })
    toast(`Venda de ${money(value)} registrada (${method})`)
    setOpen(false)
  }

  return (
    <Sheet open={open} onClose={() => setOpen(false)} title="Venda rápida" subtitle="Digite o valor e toque na forma de pagamento" size="sm">
      <div className="space-y-4">
        <div>
          <label htmlFor="sale-amount" className="mb-1.5 block text-[12.5px] text-muted">
            Valor (R$)
          </label>
          <input
            id="sale-amount"
            autoFocus
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d,.]/g, ''))}
            placeholder="0,00"
            className="h-16 w-full rounded-2xl border border-gold-500/40 bg-ink/60 px-4 font-display text-3xl font-semibold tabular-nums outline-none focus:border-gold-500"
          />
        </div>
        <div>
          <p className="mb-1.5 text-[12.5px] text-muted">O que foi feito</p>
          <div className="flex flex-wrap gap-2">
            {chips.map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => {
                  setDesc(c.name)
                  if (!value) setAmount(String(c.price).replace('.', ','))
                }}
                className={cn(
                  'h-9 rounded-full border px-3.5 text-[13px] font-medium transition',
                  desc === c.name ? 'border-gold-500 bg-gold-500 text-black' : 'border-line-2 bg-surface-2 text-muted hover:text-fg',
                )}
              >
                {c.name}
              </button>
            ))}
          </div>
          <input
            id="sale-desc"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Descrição"
            className="mt-2.5 h-11 w-full rounded-xl border border-line-2 bg-ink/60 px-3.5 text-sm outline-none focus:border-gold-500"
          />
        </div>
        <div>
          <p className="mb-1.5 text-[12.5px] text-muted">Receber em</p>
          <div className="grid grid-cols-2 gap-2.5">
            {SALE_METHODS.map((m) => (
              <button
                key={m}
                onClick={() => save(m)}
                className="h-16 rounded-2xl border border-line-2 bg-ink/40 text-[15px] font-semibold transition hover:border-gold-500 active:scale-95"
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Sheet>
  )
}

function QuickSheet() {
  const quickOpen = useUI((s) => s.quickOpen)
  const setQuickOpen = useUI((s) => s.setQuickOpen)
  return (
    <Sheet open={quickOpen} onClose={() => setQuickOpen(false)} title="Ações rápidas" subtitle="O que você quer fazer agora?" size="sm">
      <QuickGrid />
    </Sheet>
  )
}

function MoreSheet() {
  const moreOpen = useUI((s) => s.moreOpen)
  const setMoreOpen = useUI((s) => s.setMoreOpen)
  const route = useRoute()
  const s = useDB((x) => x.settings)
  return (
    <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title="Menu" subtitle={s.businessName}>
      <div className="grid grid-cols-3 gap-2.5">
        {NAV.map((n) => (
          <button
            key={n.route}
            onClick={() => {
              setMoreOpen(false)
              navigate(n.route)
            }}
            className={cn(
              'flex flex-col items-center gap-2 rounded-2xl border px-1 py-4 text-center text-[12.5px] font-medium leading-tight transition active:scale-95',
              route === n.route ? 'border-gold-500 bg-gold-500/10 text-gold-200' : 'border-line bg-ink/40 text-fg/90',
            )}
          >
            <n.icon size={24} className={n.route === 'whatsapp' ? 'text-[#25d366]' : 'text-gold-400'} />
            {n.label}
          </button>
        ))}
      </div>
      <p className="mt-5 text-center font-display text-sm italic text-muted">Mais que uma lavagem, é cuidado com seu veículo!</p>
    </Sheet>
  )
}

function SearchSheet() {
  const searchOpen = useUI((s) => s.searchOpen)
  const setSearchOpen = useUI((s) => s.setSearchOpen)
  const openDetail = useUI((s) => s.openDetail)
  const [q, setQ] = useState('')
  const clients = useDB((s) => s.clients)
  const vehicles = useDB((s) => s.vehicles)
  const orders = useDB((s) => s.orders)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setSearchOpen])
  useEffect(() => {
    if (!searchOpen) setQ('')
  }, [searchOpen])

  const res = useMemo(() => {
    const n = normalize(q.trim())
    if (n.length < 2) return null
    const cm = new Map(clients.map((c) => [c.id, c]))
    const vm = new Map(vehicles.map((v) => [v.id, v]))
    return {
      clients: clients.filter((c) => normalize(c.name + ' ' + c.phone).includes(n)).slice(0, 6),
      vehicles: vehicles
        .filter((v) => normalize(`${v.plate} ${v.brand} ${v.model}`).includes(n.replace('-', '')))
        .slice(0, 6)
        .map((v) => ({ v, c: cm.get(v.clientId) })),
      orders: orders
        .filter((o) => String(o.number).includes(n.replace('#', '')) || normalize(cm.get(o.clientId)?.name ?? '').includes(n))
        .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
        .slice(0, 6)
        .map((o) => ({ o, c: cm.get(o.clientId), v: vm.get(o.vehicleId) })),
    }
  }, [q, clients, vehicles, orders])

  const go = (d: Parameters<typeof openDetail>[0]) => {
    setSearchOpen(false)
    openDetail(d)
  }

  return (
    <Sheet open={searchOpen} onClose={() => setSearchOpen(false)} title="Buscar" size="md">
      <div className="relative">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gold-400" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Nome, telefone, placa ou nº da OS"
          className="h-12 w-full rounded-xl border border-gold-500/40 bg-ink/60 pl-10 pr-3 text-base outline-none focus:border-gold-500"
        />
      </div>
      {!res && <p className="py-8 text-center text-sm text-muted">Digite pelo menos 2 letras para buscar.</p>}
      {res && !res.clients.length && !res.vehicles.length && !res.orders.length && <p className="py-8 text-center text-sm text-muted">Nada encontrado para “{q}”.</p>}
      {res && (
        <div className="mt-3 space-y-4">
          {!!res.clients.length && (
            <Group title="Clientes">
              {res.clients.map((c) => (
                <ResultRow key={c.id} onClick={() => go({ kind: 'client', id: c.id })} left={<Avatar name={c.name} size={36} />} title={c.name} sub={c.phone} />
              ))}
            </Group>
          )}
          {!!res.vehicles.length && (
            <Group title="Veículos">
              {res.vehicles.map(({ v, c }) => (
                <ResultRow
                  key={v.id}
                  onClick={() => c && go({ kind: 'client', id: c.id })}
                  left={<VehicleThumb v={v} size={34} />}
                  title={`${v.brand} ${v.model}`}
                  sub={`${fmtPlate(v.plate)} · ${c?.name ?? '—'}`}
                />
              ))}
            </Group>
          )}
          {!!res.orders.length && (
            <Group title="Ordens de serviço">
              {res.orders.map(({ o, c }) => (
                <ResultRow
                  key={o.id}
                  onClick={() => go({ kind: 'order', id: o.id })}
                  left={<span className="grid h-9 w-9 place-items-center rounded-xl bg-surface-3 text-[11px] font-bold text-gold-300">#{o.number}</span>}
                  title={`${c?.name ?? '—'}`}
                  sub={orderTitle(o)}
                  right={<Badge tone={STATUS[o.status].tone}>{STATUS[o.status].label}</Badge>}
                />
              ))}
            </Group>
          )}
        </div>
      )}
    </Sheet>
  )
}
function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wider text-subtle">{title}</p>
      {children}
    </div>
  )
}
function ResultRow({ left, title, sub, right, onClick }: { left: ReactNode; title: string; sub: string; right?: ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-white/[0.04]">
      {left}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{title}</span>
        <span className="block truncate text-xs text-muted">{sub}</span>
      </span>
      {right}
    </button>
  )
}

/* ---------------- Toasts + confirm ---------------- */
function Toaster() {
  const toasts = useUI((s) => s.toasts)
  const dismiss = useUI((s) => s.dismiss)
  return (
    <div className="pt-safe pointer-events-none fixed inset-x-0 top-3 z-[70] flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:top-auto lg:items-end lg:pr-6" aria-live="polite">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => dismiss(t.id)}
          className="pointer-events-auto flex w-full max-w-sm animate-pop items-center gap-3 rounded-2xl border border-line-2 bg-surface-2/95 px-4 py-3 text-left text-sm shadow-2xl backdrop-blur"
        >
          {t.tone === 'success' && <CheckCircle2 size={20} className="shrink-0 text-ok" />}
          {t.tone === 'error' && <AlertCircle size={20} className="shrink-0 text-danger" />}
          {t.tone === 'info' && <Info size={20} className="shrink-0 text-gold-400" />}
          {t.message}
        </button>
      ))}
    </div>
  )
}

function ConfirmHost() {
  const c = useUI((s) => s.confirmState)
  const close = useUI((s) => s.closeConfirm)
  if (!c) return null
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center p-6" role="alertdialog" aria-modal="true">
      <div className="absolute inset-0 animate-fade-in bg-black/70" onClick={() => close(false)} />
      <div className="relative w-full max-w-sm animate-pop rounded-3xl border border-line-2 bg-surface p-6 text-center">
        <span className={cn('mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl', c.danger ? 'bg-danger/15 text-red-400' : 'bg-gold-500/15 text-gold-400')}>
          <AlertCircle size={24} />
        </span>
        <h3 className="text-lg font-semibold">{c.title}</h3>
        {c.message && <p className="mt-1.5 text-sm text-muted">{c.message}</p>}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button onClick={() => close(false)}>Cancelar</Button>
          <Button variant={c.danger ? 'danger' : 'primary'} onClick={() => close(true)} autoFocus>
            {c.confirmLabel ?? 'Confirmar'}
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ---------------- Shell ---------------- */
export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="app-bg min-h-dvh">
      <Sidebar />
      <MobileHeader />
      <main className="overflow-x-clip px-4 pb-28 pt-4 sm:px-6 lg:ml-[248px] lg:px-6 lg:pb-8 lg:pt-5 xl:px-8">
        <div className="mx-auto max-w-[1440px]">
          <DesktopTopbar />
          {children}
        </div>
      </main>
      <BottomNav />
      <QuickSheet />
      <QuickSaleSheet />
      <MoreSheet />
      <SearchSheet />
      <Toaster />
      <ConfirmHost />
    </div>
  )
}
