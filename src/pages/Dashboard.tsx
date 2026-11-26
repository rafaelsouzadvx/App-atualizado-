import { useMemo, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, Ban, Car, CheckCircle2, CircleDollarSign, HandCoins, Receipt, TrendingUp, Wrench, CalendarCheck2, Zap } from 'lucide-react'
import { BarChart, Ring } from '../components/charts'
import { QuickGrid, useNow } from '../components/Layout'
import { Badge, Button, Card, IconTile, LinkAction, VehicleThumb, toneText } from '../components/ui'
import { PaySheet } from '../components/Details'
import { navigate } from '../lib/router'
import type { Order, OrderStatus, Transaction } from '../lib/types'
import { STATUS, addDays, cn, fmtDayMonth, money, orderTitle, orderTotal, todayISO, type Tone } from '../lib/utils'
import { useClientMap, useDB, useVehicleMap } from '../store/data'
import { toast, useUI } from '../store/ui'

const pct = (a: number, b: number) => (b ? Math.round(((a - b) / b) * 100) : a ? 100 : 0)

export default function Dashboard() {
  const orders = useDB((s) => s.orders)
  const transactions = useDB((s) => s.transactions)
  const settings = useDB((s) => s.settings)
  const setSaleOpen = useUI((s) => s.setSaleOpen)
  const cm = useClientMap()
  const vm = useVehicleMap()
  const now = useNow(60000)
  const today = todayISO()
  const yesterday = addDays(today, -1)

  const d = useMemo(() => {
    const paidIn = transactions.filter((t) => t.type === 'in' && t.status === 'pago')
    const paidOut = transactions.filter((t) => t.type === 'out' && t.status === 'pago')
    const revenueOn = (date: string) => paidIn.filter((t) => t.date === date).reduce((s, t) => s + t.amount, 0)
    const salesOn = (date: string) => paidIn.filter((t) => t.date === date && t.category !== 'Ajuste').length
    const pendingIn = transactions.filter((t) => t.type === 'in' && t.status === 'pendente')
    const readyUnpaid = orders.filter((o) => o.status === 'pronto' && !o.paid && !transactions.some((t) => t.orderId === o.id))
    const month = today.slice(0, 7)
    const monthRevenue = paidIn.filter((t) => t.date.startsWith(month)).reduce((s, t) => s + t.amount, 0)
    const todays = orders.filter((o) => o.date === today).sort((a, b) => a.time.localeCompare(b.time))
    const statusCount = (s: OrderStatus) => todays.filter((o) => o.status === s).length
    return {
      revenueToday: revenueOn(today),
      revenueYesterday: revenueOn(yesterday),
      salesToday: salesOn(today),
      salesYesterday: salesOn(yesterday),
      expensesToday: paidOut.filter((t) => t.date === today).reduce((s, t) => s + t.amount, 0),
      readyUnpaid,
      toReceive: pendingIn.reduce((s, t) => s + t.amount, 0) + readyUnpaid.reduce((s, o) => s + orderTotal(o), 0),
      toReceiveCount: pendingIn.length + readyUnpaid.length,
      week: Array.from({ length: 7 }, (_, i) => {
        const date = addDays(today, i - 6)
        return { label: fmtDayMonth(date), value: revenueOn(date) }
      }),
      monthRevenue,
      todays,
      statusCount,
      latest: orders
        .filter((o) => o.status === 'entregue')
        .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
        .slice(0, 5),
      receivables: transactions
        .filter((t) => t.type === 'in' && t.status === 'pendente')
        .sort((a, b) => (a.dueDate ?? a.date).localeCompare(b.dueDate ?? b.date)),
    }
  }, [orders, transactions, today, yesterday])

  const hour = now.getHours()
  const greet = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'
  const goalPct = settings.monthlyGoal ? d.monthRevenue / settings.monthlyGoal : 0
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const daysLeft = daysInMonth - now.getDate()
  const revDelta = pct(d.revenueToday, d.revenueYesterday)
  const salesDelta = pct(d.salesToday, d.salesYesterday)
  const resultToday = d.revenueToday - d.expensesToday

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Saudação mobile */}
      <div className="lg:hidden">
        <p className="text-[13px] capitalize text-muted">{now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        <h1 className="text-[26px] font-bold tracking-tight">
          {greet}, <span className="text-gold-gradient">{settings.ownerName}!</span>
        </h1>
        <Button variant="primary" size="lg" icon={Zap} className="mt-3 w-full" onClick={() => setSaleOpen(true)}>
          Venda rápida
        </Button>
      </div>

      <div className="grid gap-4 sm:gap-5 xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_380px]">
        {/* ---------- coluna principal ---------- */}
        <div className="flex min-w-0 flex-col gap-4 sm:gap-5">
          <div className="order-1 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            <Kpi icon={CircleDollarSign} tone="green" label="Faturamento Hoje" value={money(d.revenueToday)} delta={revDelta} deltaText="vs. ontem" onClick={() => navigate('financeiro')} />
            <Kpi icon={Receipt} tone="blue" label="Vendas Hoje" value={String(d.salesToday)} delta={salesDelta} deltaText="vs. ontem" onClick={() => navigate('financeiro')} />
            <Kpi icon={TrendingUp} tone={resultToday >= 0 ? 'gold' : 'red'} label="Resultado Hoje" value={money(resultToday)} sub={`Despesas: ${money(d.expensesToday)}`} onClick={() => navigate('financeiro')} />
            <Kpi icon={HandCoins} tone="violet" label="A Receber" value={money(d.toReceive)} sub={d.toReceiveCount ? `${d.toReceiveCount} em aberto` : 'tudo em dia'} onClick={() => navigate('financeiro')} />
          </div>

          <div className="order-1">
            <ReadyToCollect orders={d.readyUnpaid} cm={cm} vm={vm} />
          </div>

          {/* Status (mobile primeiro) */}
          <div className="order-2 xl:order-3">
            <StatusCard count={d.statusCount} />
          </div>

          {/* Agenda — no celular aparece aqui em cima */}
          <div className="order-3 xl:hidden">
            <AgendaHoje orders={d.todays} />
          </div>

          <div className="order-4 grid gap-4 sm:gap-5 md:grid-cols-[minmax(0,1fr)_260px] xl:order-2">
            <Card
              title="Faturamento dos últimos 7 dias"
              action={<span className="text-[13px] font-semibold tabular-nums text-gold-300">{money(d.week.reduce((s, x) => s + x.value, 0))}</span>}
            >
              <BarChart data={d.week} height={220} />
            </Card>
            <Card title="Meta do Mês" action={<LinkAction onClick={() => navigate('config')}>Editar</LinkAction>} bodyClass="flex flex-col items-center">
              <Ring value={goalPct} size={168}>
                <div>
                  <p className="font-display text-[40px] font-semibold leading-none">{Math.round(goalPct * 100)}%</p>
                  <p className="mt-1 text-[11px] text-muted">da meta</p>
                </div>
              </Ring>
              <p className="mt-3 text-center text-[15px] font-semibold tabular-nums">
                {money(d.monthRevenue)} <span className="font-normal text-muted">/ {money(settings.monthlyGoal)}</span>
              </p>
              <p className="mt-0.5 text-center text-xs text-subtle">
                {goalPct >= 1 ? '🎉 Meta batida!' : `Faltam ${money(settings.monthlyGoal - d.monthRevenue)} · ${daysLeft} dias`}
              </p>
            </Card>
          </div>

          <div className="order-5">
            <UltimosServicos orders={d.latest} cm={cm} vm={vm} />
          </div>
        </div>

        {/* ---------- coluna lateral ---------- */}
        <div className="min-w-0 space-y-4 sm:space-y-5">
          <Card title="Ações Rápidas" className="hidden xl:block">
            <QuickGrid />
          </Card>
          <div className="hidden xl:block">
            <AgendaHoje orders={d.todays} />
          </div>
          <Receivables list={d.receivables} cm={cm} />
        </div>
      </div>
    </div>
  )
}

function Kpi({
  icon,
  tone,
  label,
  value,
  delta,
  deltaText,
  sub,
  onClick,
}: {
  icon: typeof Car
  tone: Tone
  label: string
  value: string
  delta?: number
  deltaText?: string
  sub?: string
  onClick?: () => void
}) {
  const up = (delta ?? 0) >= 0
  return (
    <button onClick={onClick} className="card group p-3.5 text-left transition hover:-translate-y-0.5 hover:border-gold-500/40 sm:p-5">
      <IconTile icon={icon} tone={tone} />
      <p className="mt-3 truncate text-[12.5px] text-muted sm:text-[14px] sm:text-fg/85">{label}</p>
      <p className="mt-0.5 truncate font-display text-[22px] font-semibold tabular-nums leading-tight sm:text-[26px] 2xl:text-[30px]">{value}</p>
      {delta !== undefined ? (
        <p className="mt-1 flex items-center gap-1 text-[11.5px] sm:text-[13px]">
          <span className={cn('inline-flex items-center font-semibold', up ? 'text-green-400' : 'text-red-400')}>
            {up ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
            {Math.abs(delta)}%
          </span>
          <span className="truncate text-muted">{deltaText}</span>
        </p>
      ) : (
        <p className="mt-1 truncate text-[11.5px] text-muted sm:text-[13px]">{sub}</p>
      )}
    </button>
  )
}

const STATUS_TILES: { s: OrderStatus; icon: typeof Car; label: string }[] = [
  { s: 'agendado', icon: CalendarCheck2, label: 'Agendados' },
  { s: 'andamento', icon: Wrench, label: 'Em andamento' },
  { s: 'pronto', icon: CheckCircle2, label: 'Prontos' },
  { s: 'entregue', icon: Car, label: 'Entregues' },
  { s: 'cancelado', icon: Ban, label: 'Cancelados' },
]
const TILE_TONE: Record<OrderStatus, Tone> = { agendado: 'blue', andamento: 'gold', pronto: 'green', entregue: 'violet', cancelado: 'red' }

function StatusCard({ count }: { count: (s: OrderStatus) => number }) {
  return (
    <Card title="Status dos Serviços" action={<span className="text-xs text-muted">hoje</span>}>
      <div className="no-scrollbar -mx-4 flex gap-2.5 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-5 sm:gap-3 sm:px-0">
        {STATUS_TILES.map((t) => (
          <button
            key={t.s}
            onClick={() => navigate('agenda')}
            className="flex min-w-[104px] shrink-0 flex-col items-center gap-1.5 rounded-2xl border border-line-2 bg-ink/40 px-2 py-3 transition hover:border-gold-500/40 sm:min-w-0"
          >
            <IconTile icon={t.icon} tone={TILE_TONE[t.s]} size="sm" />
            <span className="whitespace-nowrap text-[12.5px] text-fg/85">{t.label}</span>
            <span className={cn('font-display text-2xl font-semibold leading-none', toneText[TILE_TONE[t.s]])}>{count(t.s)}</span>
          </button>
        ))}
      </div>
    </Card>
  )
}

function AgendaHoje({ orders }: { orders: Order[] }) {
  const cm = useClientMap()
  const vm = useVehicleMap()
  const open = useUI((s) => s.openDetail)
  const all = orders.filter((o) => o.status !== 'cancelado')
  const list = all.slice(0, 8)
  return (
    <Card title="Agenda de Hoje" action={<LinkAction onClick={() => navigate('agenda')}>Ver todos</LinkAction>} bodyClass="!px-2 sm:!px-3 !pb-2">
      {all.length > list.length && (
        <button onClick={() => navigate('agenda')} className="mt-1 w-full rounded-xl py-2.5 text-[13px] font-medium text-gold-400 hover:bg-white/[0.03]">
          + {all.length - list.length} serviço(s) — ver agenda completa
        </button>
      )}
      {!list.length && <p className="px-3 py-8 text-center text-sm text-muted">Nenhum serviço agendado para hoje.</p>}
      <ul className="divide-y divide-line/70">
        {list.map((o) => {
          const c = cm.get(o.clientId)
          const v = vm.get(o.vehicleId)
          const st = STATUS[o.status]
          return (
            <li key={o.id}>
              <button onClick={() => open({ kind: 'order', id: o.id })} className="flex w-full items-start gap-3 rounded-xl px-2 py-2.5 text-left transition hover:bg-white/[0.03]">
                <span className="w-12 shrink-0 pt-0.5 font-display text-[17px] font-semibold tabular-nums">{o.time}</span>
                <span className="min-w-0 flex-1 leading-snug">
                  <span className="block truncate text-[14px] font-medium">{c?.name ?? '—'}</span>
                  <span className="block truncate text-[12.5px] text-muted">{orderTitle(o)}</span>
                  <span className="block truncate text-[12px] text-subtle">
                    {v ? `${v.brand} ${v.model} - ${v.plate}` : ''}
                  </span>
                </span>
                <Badge tone={o.status === 'entregue' ? 'green' : st.tone}>{o.status === 'entregue' ? 'Concluído' : st.label}</Badge>
              </button>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

function UltimosServicos({ orders, cm, vm }: { orders: Order[]; cm: ReturnType<typeof useClientMap>; vm: ReturnType<typeof useVehicleMap> }) {
  const open = useUI((s) => s.openDetail)
  return (
    <Card title="Últimos Serviços Realizados" action={<LinkAction onClick={() => navigate('os')}>Ver todos</LinkAction>} bodyClass="!px-2 sm:!px-3 !pb-2">
      <ul className="divide-y divide-line/70">
        {orders.map((o) => {
          const c = cm.get(o.clientId)
          const v = vm.get(o.vehicleId)
          return (
            <li key={o.id}>
              <button onClick={() => open({ kind: 'order', id: o.id })} className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-2 py-2.5 text-left transition hover:bg-white/[0.03] md:grid-cols-[auto_minmax(0,1.1fr)_minmax(0,1.2fr)_100px_auto]">
                <VehicleThumb v={v} size={40} />
                <span className="min-w-0 leading-snug">
                  <span className="block truncate text-[14px] font-medium">{c?.name ?? '—'}</span>
                  <span className="block truncate text-[12.5px] text-muted">
                    {v ? `${v.brand} ${v.model} ${v.year}` : ''}
                    <span className="md:hidden"> · {orderTitle(o)}</span>
                  </span>
                </span>
                <span className="hidden truncate text-[13.5px] text-fg/85 md:block">{orderTitle(o)}</span>
                <span className="hidden text-[14px] font-semibold tabular-nums md:block">{money(orderTotal(o))}</span>
                <span className="flex flex-col items-end gap-1">
                  <span className="text-[13px] font-semibold tabular-nums md:hidden">{money(orderTotal(o))}</span>
                  <Badge tone="green">Concluído</Badge>
                  <span className="hidden text-[11px] tabular-nums text-subtle md:block">
                    {fmtDayMonth(o.date)} · {o.time}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

function Receivables({ list, cm }: { list: Transaction[]; cm: ReturnType<typeof useClientMap> }) {
  const receive = useDB((s) => s.receive)
  const [sel, setSel] = useState<Transaction | null>(null)
  const today = todayISO()
  const total = list.reduce((s, t) => s + t.amount, 0)
  return (
    <Card title="Contas a Receber" action={<LinkAction onClick={() => navigate('financeiro')}>Ver todos</LinkAction>}>
      <div className="mb-2 flex items-baseline justify-between rounded-xl bg-gold-500/[0.06] px-3 py-2 ring-1 ring-gold-500/15">
        <span className="text-xs text-muted">Total pendente</span>
        <span className="font-display text-lg font-semibold text-gold-300">{money(total)}</span>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] gap-x-3 px-1 text-[11px] font-medium text-subtle">
        <span>Cliente</span>
        <span className="text-right">Valor</span>
        <span>Venc.</span>
        <span className="text-right">Status</span>
      </div>
      <ul className="mt-1">
        {list.slice(0, 6).map((t) => {
          const late = (t.dueDate ?? t.date) < today
          return (
            <li key={t.id}>
              <button
                onClick={() => setSel(t)}
                className="grid w-full grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-x-3 rounded-lg px-1 py-2 text-left text-[13px] transition hover:bg-white/[0.03]"
              >
                <span className="truncate">{cm.get(t.clientId ?? '')?.name ?? t.description}</span>
                <span className="text-right tabular-nums">{money(t.amount)}</span>
                <span className="tabular-nums text-muted">{fmtDayMonth(t.dueDate ?? t.date)}</span>
                <span className="text-right">
                  <Badge tone={late ? 'red' : 'gold'} className="!px-2">
                    {late ? 'Vencido' : 'Pendente'}
                  </Badge>
                </span>
              </button>
            </li>
          )
        })}
        {!list.length && <p className="py-6 text-center text-sm text-muted">Nada pendente. 🎉</p>}
      </ul>
      <PaySheet
        open={!!sel}
        pending
        total={sel?.amount ?? 0}
        onClose={() => setSel(null)}
        onPick={(m) => {
          if (!sel) return
          receive(sel.id, m)
          toast(`Recebido ${money(sel.amount)} via ${m}`)
          setSel(null)
        }}
      />
    </Card>
  )
}


function ReadyToCollect({ orders, cm, vm }: { orders: Order[]; cm: ReturnType<typeof useClientMap>; vm: ReturnType<typeof useVehicleMap> }) {
  const deliverOrder = useDB((s) => s.deliverOrder)
  const [sel, setSel] = useState<Order | null>(null)
  if (!orders.length) return null
  return (
    <Card title="Prontos para cobrar" action={<Badge tone="green">{orders.length}</Badge>} bodyClass="!px-2 sm:!px-3 !pb-2">
      <ul className="divide-y divide-line/70">
        {orders.map((o) => {
          const v = vm.get(o.vehicleId)
          return (
            <li key={o.id} className="flex items-center gap-3 px-2 py-2.5">
              <span className="min-w-0 flex-1 leading-snug">
                <span className="block truncate text-[14px] font-medium">{cm.get(o.clientId)?.name ?? '—'}</span>
                <span className="block truncate text-[12.5px] text-muted">
                  {v ? `${v.brand} ${v.model} · ${v.plate}` : orderTitle(o)}
                </span>
              </span>
              <span className="shrink-0 text-[14px] font-semibold tabular-nums">{money(orderTotal(o))}</span>
              <Button variant="primary" size="sm" onClick={() => setSel(o)}>
                Receber
              </Button>
            </li>
          )
        })}
      </ul>
      <PaySheet
        open={!!sel}
        total={sel ? orderTotal(sel) : 0}
        onClose={() => setSel(null)}
        onPick={(m) => {
          if (!sel) return
          deliverOrder(sel.id, m)
          toast(m === 'A prazo' ? 'Entregue — lançado em contas a receber' : `Recebido ${money(orderTotal(sel))} via ${m}`)
          setSel(null)
        }}
      />
    </Card>
  )
}
