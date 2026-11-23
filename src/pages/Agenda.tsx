import { useMemo, useRef, useEffect, useState } from 'react'
import { CalendarPlus, ChevronLeft, ChevronRight, Columns3, List, CalendarX2, ArrowRight } from 'lucide-react'
import { Badge, Button, Empty, PageHeader, VehicleThumb, toneBg } from '../components/ui'
import type { Order, OrderStatus } from '../lib/types'
import { STATUS, STATUS_FLOW, addDays, cn, fmtPlate, money, orderTitle, orderTotal, parseISO, todayISO } from '../lib/utils'
import { useClientMap, useDB, useVehicleMap } from '../store/data'
import { openForm, toast, useUI } from '../store/ui'

export default function Agenda() {
  const orders = useDB((s) => s.orders)
  const [day, setDay] = useState(todayISO())
  const [view, setView] = useState<'list' | 'board'>('list')
  const today = todayISO()
  const start = addDays(day, -((parseISO(day).getDay() + 6) % 7)) // segunda-feira
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i))
  const counts = useMemo(() => {
    const m = new Map<string, number>()
    orders.forEach((o) => o.status !== 'cancelado' && m.set(o.date, (m.get(o.date) ?? 0) + 1))
    return m
  }, [orders])
  const list = useMemo(() => orders.filter((o) => o.date === day).sort((a, b) => a.time.localeCompare(b.time)), [orders, day])
  const active = list.filter((o) => o.status !== 'cancelado')
  const d = parseISO(day)

  return (
    <div>
      <PageHeader
        title="Agenda"
        subtitle={d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        actions={
          <>
            <div className="hidden rounded-xl border border-line-2 bg-surface p-1 sm:flex">
              {(
                [
                  ['list', List, 'Lista'],
                  ['board', Columns3, 'Quadro'],
                ] as const
              ).map(([v, I, l]) => (
                <button key={v} onClick={() => setView(v)} className={cn('flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium', view === v ? 'bg-surface-3 text-gold-300' : 'text-muted')}>
                  <I size={16} /> {l}
                </button>
              ))}
            </div>
            <Button variant="primary" icon={CalendarPlus} onClick={() => openForm({ kind: 'order', preset: { date: day } })}>
              Agendar
            </Button>
          </>
        }
      />

      {/* seletor de semana */}
      <div className="card mb-4 p-2 sm:p-3">
        <div className="mb-1.5 flex items-center justify-between px-1">
          <button onClick={() => setDay(addDays(day, -7))} className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-fg" aria-label="Semana anterior">
            <ChevronLeft size={19} />
          </button>
          <span className="text-[13px] font-medium capitalize text-muted">{parseISO(start).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span>
          <div className="flex items-center gap-1">
            {day !== today && (
              <button onClick={() => setDay(today)} className="h-8 rounded-lg px-2.5 text-[12.5px] font-semibold text-gold-400 hover:bg-gold-500/10">
                Hoje
              </button>
            )}
            <button onClick={() => setDay(addDays(day, 7))} className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-fg" aria-label="Próxima semana">
              <ChevronRight size={19} />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((x) => {
            const sel = x === day
            const n = counts.get(x) ?? 0
            return (
              <button
                key={x}
                onClick={() => setDay(x)}
                className={cn(
                  'flex flex-col items-center gap-0.5 rounded-xl py-2 transition',
                  sel ? 'bg-gold-gradient text-black shadow-gold' : x === today ? 'bg-gold-500/10 text-gold-200' : 'hover:bg-white/[0.04]',
                )}
              >
                <span className={cn('text-[11px] uppercase', sel ? 'font-semibold' : 'text-muted')}>{parseISO(x).toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0, 3)}</span>
                <span className="font-display text-lg font-semibold leading-none">{parseISO(x).getDate()}</span>
                <span className={cn('mt-0.5 h-1.5 w-1.5 rounded-full', n ? (sel ? 'bg-black/70' : 'bg-gold-400') : 'bg-transparent')} />
              </button>
            )
          })}
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between text-sm">
        <span className="text-muted">
          <b className="text-fg">{active.length}</b> serviço(s) · previsto <b className="text-gold-300">{money(active.reduce((s, o) => s + orderTotal(o), 0))}</b>
        </span>
        <button onClick={() => setView(view === 'list' ? 'board' : 'list')} className="flex items-center gap-1.5 text-[13px] text-gold-400 sm:hidden">
          {view === 'list' ? <Columns3 size={16} /> : <List size={16} />}
          {view === 'list' ? 'Quadro' : 'Lista'}
        </button>
      </div>

      {!list.length ? (
        <div className="card">
          <Empty
            icon={CalendarX2}
            title="Dia livre"
            text="Nenhum serviço agendado para este dia."
            action={
              <Button variant="primary" icon={CalendarPlus} onClick={() => openForm({ kind: 'order', preset: { date: day } })}>
                Agendar serviço
              </Button>
            }
          />
        </div>
      ) : view === 'list' ? (
        <Timeline list={list} />
      ) : (
        <Board list={list} />
      )}
    </div>
  )
}

function useAdvance() {
  const setOrderStatus = useDB((s) => s.setOrderStatus)
  const openDetail = useUI((s) => s.openDetail)
  return (o: Order) => {
    if (o.status === 'pronto') return openDetail({ kind: 'order', id: o.id }) // pagamento é escolhido no detalhe
    const next = STATUS_FLOW[STATUS_FLOW.indexOf(o.status) + 1]
    if (!next) return
    setOrderStatus(o.id, next)
    toast(`OS #${o.number} → ${STATUS[next].label}`)
  }
}

function Timeline({ list }: { list: Order[] }) {
  const cm = useClientMap()
  const vm = useVehicleMap()
  const open = useUI((s) => s.openDetail)
  const advance = useAdvance()
  return (
    <ol className="relative space-y-2.5 before:absolute before:bottom-3 before:left-[27px] before:top-3 before:w-px before:bg-line sm:before:left-[35px]">
      {list.map((o) => {
        const c = cm.get(o.clientId)
        const v = vm.get(o.vehicleId)
        const st = STATUS[o.status]
        const canAdvance = ['agendado', 'andamento', 'pronto'].includes(o.status)
        return (
          <li key={o.id} className="relative flex gap-3">
            <div className="z-10 flex w-14 shrink-0 flex-col items-center pt-3 sm:w-[70px]">
              <span className={cn('h-3 w-3 rounded-full ring-4 ring-ink', toneBg[st.tone])} />
              <span className="mt-1.5 font-display text-[15px] font-semibold tabular-nums">{o.time}</span>
            </div>
            <div className={cn('card flex min-w-0 flex-1 items-center gap-3 p-3 transition hover:border-gold-500/40', o.status === 'cancelado' && 'opacity-50')}>
              <button onClick={() => open({ kind: 'order', id: o.id })} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <span className="hidden sm:block">
                  <VehicleThumb v={v} size={42} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-medium">{c?.name ?? '—'}</span>
                    <span className="hidden sm:inline">
                      <Badge tone={st.tone}>{st.label}</Badge>
                    </span>
                  </span>
                  <span className="block truncate text-[13px] text-muted">{orderTitle(o)}</span>
                  <span className="block truncate text-[12px] text-subtle">
                    {v ? `${v.brand} ${v.model} · ${fmtPlate(v.plate)}` : ''} · <span className="text-fg/70">{money(orderTotal(o))}</span>
                  </span>
                  <span className="mt-1.5 block sm:hidden">
                    <Badge tone={st.tone}>{st.label}</Badge>
                  </span>
                </span>
              </button>
              {canAdvance && (
                <button
                  onClick={() => advance(o)}
                  title={o.status === 'pronto' ? 'Entregar' : `Avançar para ${STATUS[STATUS_FLOW[STATUS_FLOW.indexOf(o.status) + 1]].label}`}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-gold-500/40 text-gold-300 transition hover:bg-gold-500/10 active:scale-95"
                >
                  <ArrowRight size={19} />
                </button>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

function Board({ list }: { list: Order[] }) {
  const cm = useClientMap()
  const vm = useVehicleMap()
  const open = useUI((s) => s.openDetail)
  const advance = useAdvance()
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => ref.current?.scrollTo({ left: 0 }), [])
  const cols: OrderStatus[] = ['agendado', 'andamento', 'pronto', 'entregue']
  return (
    <div ref={ref} className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:px-0 xl:grid-cols-4">
      {cols.map((s) => {
        const items = list.filter((o) => o.status === s)
        return (
          <section key={s} className="card w-[80vw] max-w-[320px] shrink-0 snap-start p-3 sm:w-auto sm:max-w-none">
            <header className="mb-2.5 flex items-center justify-between px-1">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <span className={cn('h-2.5 w-2.5 rounded-full', toneBg[STATUS[s].tone])} />
                {STATUS[s].label}
              </span>
              <span className="rounded-full bg-white/5 px-2 text-xs tabular-nums text-muted">{items.length}</span>
            </header>
            <div className="space-y-2">
              {items.map((o) => {
                const v = vm.get(o.vehicleId)
                return (
                  <div key={o.id} className="rounded-xl border border-line bg-ink/50 p-3">
                    <button onClick={() => open({ kind: 'order', id: o.id })} className="block w-full text-left">
                      <span className="flex items-center justify-between text-[12px] text-muted">
                        <span className="font-display text-sm font-semibold text-fg">{o.time}</span>#{o.number}
                      </span>
                      <span className="mt-1 block truncate text-sm font-medium">{cm.get(o.clientId)?.name}</span>
                      <span className="block truncate text-[12.5px] text-muted">{orderTitle(o)}</span>
                      <span className="block truncate text-[12px] text-subtle">{v ? `${v.model} · ${fmtPlate(v.plate)}` : ''}</span>
                    </button>
                    {s !== 'entregue' && (
                      <button onClick={() => advance(o)} className="mt-2 flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-white/[0.04] text-[12.5px] font-medium text-gold-300 hover:bg-gold-500/10">
                        {s === 'pronto' ? 'Entregar' : `Mover p/ ${STATUS[STATUS_FLOW[STATUS_FLOW.indexOf(s) + 1]].label}`} <ArrowRight size={14} />
                      </button>
                    )}
                  </div>
                )
              })}
              {!items.length && <p className="rounded-xl border border-dashed border-line px-3 py-6 text-center text-xs text-subtle">Vazio</p>}
            </div>
          </section>
        )
      })}
    </div>
  )
}
