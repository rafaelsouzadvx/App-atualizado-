import { useMemo, useState } from 'react'
import { Download, FileText, Printer } from 'lucide-react'
import { BarChart, Donut, HBars } from '../components/charts'
import { Badge, Button, Card, Chips, Empty, PageHeader, Stat } from '../components/ui'
import { addDays, downloadFile, fmtDate, fmtDayMonth, money, orderTitle, orderTotal, parseISO, STATUS, toCSV, todayISO, type Tone } from '../lib/utils'
import { useClientMap, useDB, useVehicleMap } from '../store/data'
import { toast } from '../store/ui'

type P = 'today' | '7' | '30' | 'month' | '90'
const WD = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const sum = (a: number[]) => a.reduce((s, n) => s + n, 0)

interface Alert {
  tone: Tone
  tag: string
  title: string
  text: string
}

export default function Relatorios() {
  const orders = useDB((s) => s.orders)
  const transactions = useDB((s) => s.transactions)
  const services = useDB((s) => s.services)
  const inspections = useDB((s) => s.inspections)
  const settings = useDB((s) => s.settings)
  const cm = useClientMap()
  const vm = useVehicleMap()
  const [p, setP] = useState<P>('30')
  const today = todayISO()
  const from = p === 'today' ? today : p === 'month' ? today.slice(0, 8) + '01' : addDays(today, -(Number(p) - 1))
  const days = Math.round((parseISO(today).getTime() - parseISO(from).getTime()) / 86400000) + 1

  const r = useMemo(() => {
    const inRange = (d: string) => d >= from && d <= today
    const tx = transactions.filter((t) => inRange(t.date))
    const paidIn = tx.filter((t) => t.type === 'in' && t.status === 'pago')
    const paidOut = tx.filter((t) => t.type === 'out' && t.status === 'pago')
    const pendingOut = transactions.filter((t) => t.type === 'out' && t.status === 'pendente')
    const revenue = sum(paidIn.map((t) => t.amount))
    const sales = paidIn.filter((t) => t.category !== 'Ajuste')
    const expenses = sum(paidOut.map((t) => t.amount))

    // OS que já passaram pelo balcão (prontas ou entregues) no período
    const done = orders.filter((o) => (o.status === 'entregue' || o.status === 'pronto') && inRange(o.date))
    const unpaidReady = orders.filter((o) => o.status === 'pronto' && !o.paid && !transactions.some((t) => t.orderId === o.id))
    const pendingIn = transactions.filter((t) => t.type === 'in' && t.status === 'pendente')
    const toReceive = sum(unpaidReady.map(orderTotal)) + sum(pendingIn.map((t) => t.amount))

    const daily = Array.from({ length: days }, (_, i) => {
      const d = addDays(from, i)
      return { label: fmtDayMonth(d), value: sum(paidIn.filter((t) => t.date === d).map((t) => t.amount)) }
    })

    const group = (list: { key: string; value: number }[]) => {
      const m = new Map<string, number>()
      list.forEach((x) => m.set(x.key, (m.get(x.key) ?? 0) + x.value))
      return [...m].map(([label, value]) => ({ label, value })).filter((d) => d.value > 0).sort((a, b) => b.value - a.value)
    }
    const methods = group(paidIn.filter((t) => t.category !== 'Ajuste').map((t) => ({ key: t.method ?? 'Não informado', value: t.amount })))
    const outCats = group(paidOut.map((t) => ({ key: t.category || 'Outros', value: t.amount })))

    const bySvc = new Map<string, { value: number; n: number }>()
    const svcCat = new Map(services.map((s) => [s.id, s.category]))
    const byCat = new Map<string, number>()
    done.forEach((o) =>
      o.items.forEach((i) => {
        const name = i.name.trim()
        const cur = bySvc.get(name) ?? { value: 0, n: 0 }
        bySvc.set(name, { value: cur.value + i.price * i.qty, n: cur.n + i.qty })
        const cat = (i.serviceId && svcCat.get(i.serviceId)) || 'Outros'
        byCat.set(cat, (byCat.get(cat) ?? 0) + i.price * i.qty)
      }),
    )
    const byClient = new Map<string, number>()
    done.forEach((o) => byClient.set(o.clientId, (byClient.get(o.clientId) ?? 0) + orderTotal(o)))
    const byWd = Array.from({ length: 7 }, () => 0)
    done.forEach((o) => (byWd[parseISO(o.date).getDay()] += 1))

    // meta do mês (sempre o mês corrente, independente do período escolhido)
    const monthStart = today.slice(0, 8) + '01'
    const monthRevenue = sum(transactions.filter((t) => t.type === 'in' && t.status === 'pago' && t.date >= monthStart && t.date <= today).map((t) => t.amount))
    const dayOfMonth = Number(today.slice(8))
    const daysInMonth = new Date(Number(today.slice(0, 4)), Number(today.slice(5, 7)), 0).getDate()

    const statusCount = (['agendado', 'andamento', 'pronto', 'entregue', 'cancelado'] as const)
      .map((s) => ({ s, n: orders.filter((o) => o.status === s && inRange(o.date)).length }))
      .filter((x) => x.n > 0)

    // pontos de atenção
    const alerts: Alert[] = []
    if (unpaidReady.length)
      alerts.push({
        tone: 'red',
        tag: 'Cobrar',
        title: `${unpaidReady.length} OS pronta${unpaidReady.length > 1 ? 's' : ''} sem pagamento · ${money(sum(unpaidReady.map(orderTotal)))}`,
        text: unpaidReady.map((o) => `#${o.number} ${cm.get(o.clientId)?.name ?? ''}`.trim()).join(', '),
      })
    pendingIn
      .filter((t) => !unpaidReady.some((o) => o.id === t.orderId))
      .forEach((t) => alerts.push({ tone: 'red', tag: 'Receber', title: `${t.description.trim()} · ${money(t.amount)}`, text: `vence ${fmtDate(t.dueDate ?? t.date)}` }))
    pendingOut.forEach((t) =>
      alerts.push({ tone: 'gold', tag: 'Pagar', title: `${t.description.trim()} · ${money(t.amount)}`, text: `vence ${fmtDate(t.dueDate ?? t.date)}${t.method ? ` · ${t.method}` : ''}` }),
    )
    orders
      .filter((o) => o.status === 'agendado' && o.date >= today)
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
      .slice(0, 3)
      .forEach((o) => {
        const v = vm.get(o.vehicleId)
        alerts.push({ tone: 'blue', tag: 'Agenda', title: `OS #${o.number} · ${cm.get(o.clientId)?.name ?? '—'}`, text: `${fmtDate(o.date)} às ${o.time}${v ? ` · ${v.brand} ${v.model}` : ''}` })
      })
    const orphan = inspections.filter((i) => !cm.has(i.clientId))
    if (orphan.length)
      alerts.push({ tone: 'gold', tag: 'Dados', title: `${orphan.length} vistoria sem cliente cadastrado`, text: 'O cliente ou veículo dessa vistoria não existe mais no cadastro.' })
    const names = new Map<string, number>()
    services.forEach((s) => names.set(s.name.trim(), (names.get(s.name.trim()) ?? 0) + 1))
    const dups = [...names].filter(([, n]) => n > 1).map(([name]) => name)
    if (dups.length) alerts.push({ tone: 'gold', tag: 'Catálogo', title: `Serviço duplicado: ${dups.join(', ')}`, text: 'Revise os preços na tela de Serviços.' })

    return {
      tx,
      paidIn,
      revenue,
      expenses,
      pendingOutTotal: sum(pendingOut.map((t) => t.amount)),
      toReceive,
      unpaidReadyN: unpaidReady.length,
      done,
      ticket: sales.length ? sum(sales.map((t) => t.amount)) / sales.length : 0,
      daily,
      methods,
      outCats,
      services: [...bySvc].map(([label, v]) => ({ label, value: v.value, sub: `${v.n}x` })).sort((a, b) => b.value - a.value).slice(0, 6),
      cats: [...byCat].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value),
      clients: [...byClient].map(([id, value]) => ({ label: cm.get(id)?.name ?? '—', value })).sort((a, b) => b.value - a.value).slice(0, 5),
      weekday: [1, 2, 3, 4, 5, 6, 0].map((i) => ({ label: WD[i], value: byWd[i] })),
      monthRevenue,
      dayOfMonth,
      daysInMonth,
      statusCount,
      alerts,
    }
  }, [orders, transactions, services, inspections, from, today, days, cm, vm])

  const result = r.revenue - r.expenses
  const margin = r.revenue ? Math.round((result / r.revenue) * 100) : 0
  const goal = settings.monthlyGoal
  const goalPct = goal ? (r.monthRevenue / goal) * 100 : 0
  const remaining = Math.max(goal - r.monthRevenue, 0)
  const projection = (r.monthRevenue / r.dayOfMonth) * r.daysInMonth
  const perDay = remaining / Math.max(r.daysInMonth - r.dayOfMonth, 1)

  const exportTx = () => {
    const rows = [
      ['Data', 'Tipo', 'Descrição', 'Categoria', 'Forma', 'Situação', 'Valor'],
      ...[...r.tx]
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((t) => [fmtDate(t.date), t.type === 'in' ? 'Entrada' : 'Saída', t.description.trim(), t.category, t.method ?? '', t.status === 'pago' ? 'Pago' : 'Pendente', (t.type === 'in' ? t.amount : -t.amount).toFixed(2).replace('.', ',')]),
    ]
    downloadFile(`lancamentos-${from}_${today}.csv`, toCSV(rows))
    toast('Lançamentos exportados')
  }

  const exportOS = () => {
    const rows = [
      ['OS', 'Data', 'Hora', 'Cliente', 'Veículo', 'Placa', 'Serviços', 'Desconto', 'Total', 'Pagamento'],
      ...r.done.map((o) => {
        const v = vm.get(o.vehicleId)
        return [o.number, fmtDate(o.date), o.time, cm.get(o.clientId)?.name ?? '', v ? `${v.brand} ${v.model}` : '', v?.plate ?? '', orderTitle(o), o.discount.toFixed(2).replace('.', ','), orderTotal(o).toFixed(2).replace('.', ','), o.payMethod ?? '']
      }),
    ]
    downloadFile(`servicos-${from}_${today}.csv`, toCSV(rows))
    toast('Serviços exportados')
  }

  const txList = [...r.tx].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div>
      <PageHeader
        title="Relatórios"
        subtitle={from === today ? `Hoje, ${fmtDate(today)}` : `${fmtDate(from)} até ${fmtDate(today)}`}
        actions={
          <>
            <span className="hidden sm:contents">
              <Button icon={Printer} onClick={() => window.print()}>
                Imprimir
              </Button>
              <Button icon={FileText} onClick={exportOS}>
                Serviços
              </Button>
            </span>
            <Button variant="primary" icon={Download} onClick={exportTx}>
              Exportar
            </Button>
          </>
        }
      />
      <Chips
        className="no-print mb-4"
        value={p}
        onChange={setP}
        options={[
          { value: 'today', label: 'Hoje' },
          { value: '7', label: '7 dias' },
          { value: '30', label: '30 dias' },
          { value: 'month', label: 'Este mês' },
          { value: '90', label: '90 dias' },
        ]}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Receita recebida" value={money(r.revenue)} tone="gold" sub={`${r.paidIn.filter((t) => t.category !== 'Ajuste').length} entradas · ticket ${money(r.ticket)}`} />
        <Stat label="Despesas pagas" value={money(r.expenses)} sub={r.pendingOutTotal ? `+ ${money(r.pendingOutTotal)} pendente` : 'nenhuma pendência'} />
        <Stat label="Resultado" value={money(result)} tone={result >= 0 ? 'green' : 'red'} sub={`margem ${margin}%`} />
        <Stat label="A receber" value={money(r.toReceive)} tone={r.toReceive ? 'blue' : undefined} sub={r.unpaidReadyN ? `${r.unpaidReadyN} OS pronta${r.unpaidReadyN > 1 ? 's' : ''} sem pagar` : 'tudo em dia'} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Meta do mês" action={goal ? <span className="text-[13px] text-muted tabular-nums">{money(goal)}</span> : undefined}>
          {goal ? (
            <div>
              <p className="font-display text-4xl font-semibold tabular-nums text-gold-300">{goalPct.toFixed(1).replace('.', ',')}%</p>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-surface-3" role="progressbar" aria-valuenow={Math.round(goalPct)} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full min-w-1 rounded-full bg-gold-gradient transition-[width] duration-700" style={{ width: `${Math.min(goalPct, 100)}%` }} />
              </div>
              <p className="mt-2 text-sm text-muted tabular-nums">
                {money(r.monthRevenue)} recebidos · faltam {money(remaining)}
              </p>
              <p className="mt-2 text-[13px] text-subtle">
                No ritmo atual (dia {r.dayOfMonth} de {r.daysInMonth}) o mês fecha em {money(projection)}. Para bater a meta, são {money(perDay)} por dia até o fim do mês.
              </p>
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-muted">Defina a meta mensal em Configurações.</p>
          )}
        </Card>

        <Card title="Atenção" action={<span className="text-[13px] text-muted">{r.alerts.length} itens</span>}>
          {r.alerts.length ? (
            <ul className="space-y-2">
              {r.alerts.map((a, i) => (
                <li key={i} className="flex items-start gap-3 rounded-xl bg-surface-2 px-3 py-2.5">
                  <Badge tone={a.tone} className="mt-0.5">
                    {a.tag}
                  </Badge>
                  <div className="min-w-0 text-sm">
                    <p className="font-medium">{a.title}</p>
                    <p className="text-[13px] text-muted">{a.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-muted">Nada pendente por aqui.</p>
          )}
        </Card>

        <Card title="Receita por dia" className="lg:col-span-2">
          <BarChart data={r.daily} height={230} highlightLast={false} />
        </Card>

        <Card title="Entradas por forma de pagamento">{r.methods.length ? <MethodList data={r.methods} /> : <NoData />}</Card>
        <Card title="Saídas por categoria">{r.outCats.length ? <HBars data={r.outCats} /> : <NoData />}</Card>

        <Card title="Serviços que mais faturam">{r.services.length ? <HBars data={r.services} /> : <NoData />}</Card>
        <Card title="Faturamento por categoria">{r.cats.length ? <Donut data={r.cats} /> : <NoData />}</Card>

        <Card title="Melhores clientes">{r.clients.length ? <HBars data={r.clients} /> : <NoData />}</Card>
        <Card title="Movimento por dia da semana">
          <BarChart data={r.weekday} height={200} highlightLast={false} />
        </Card>

        <Card title="Ordens de serviço no período" className="lg:col-span-2">
          {r.statusCount.length ? (
            <div className="flex flex-wrap gap-2">
              {r.statusCount.map(({ s, n }) => (
                <Badge key={s} tone={STATUS[s].tone} dot>
                  {STATUS[s].label}: {n}
                </Badge>
              ))}
            </div>
          ) : (
            <NoData />
          )}
        </Card>

        <Card title="Lançamentos do período" action={<span className="text-[13px] text-muted">{txList.length} registros</span>} className="lg:col-span-2">
          {txList.length ? (
            <ul className="max-h-[420px] divide-y divide-line overflow-y-auto">
              {txList.map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-2.5 text-sm">
                  <span className="w-12 shrink-0 text-[12.5px] text-subtle tabular-nums">{fmtDayMonth(t.date)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{t.description.trim()}</p>
                    <p className="truncate text-xs text-subtle">
                      {t.category}
                      {t.method ? ` · ${t.method}` : ''}
                    </p>
                  </div>
                  {t.status === 'pendente' && <Badge tone="gold">Pendente</Badge>}
                  <span className={t.type === 'in' ? 'shrink-0 font-semibold tabular-nums text-green-400' : 'shrink-0 font-semibold tabular-nums text-red-400'}>
                    {t.type === 'in' ? '+' : '−'} {money(t.amount)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty icon={FileText} title="Sem lançamentos" text="Nenhuma entrada ou saída neste período." />
          )}
        </Card>
      </div>
    </div>
  )
}

function MethodList({ data }: { data: { label: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1
  return <HBars data={data.map((d) => ({ ...d, sub: `${Math.round((d.value / total) * 100)}%` }))} />
}

const NoData = () => <p className="py-6 text-center text-sm text-muted">Sem dados no período.</p>
