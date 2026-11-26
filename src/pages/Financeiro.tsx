import { useMemo, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Download, Minus, Plus, Wallet, CheckCircle2 } from 'lucide-react'
import { Badge, Button, Card, Chips, Empty, PageHeader, Stat } from '../components/ui'
import { HBars } from '../components/charts'
import { PaySheet } from '../components/Details'
import type { Transaction } from '../lib/types'
import { addDays, cn, downloadFile, fmtDate, money, toCSV, todayISO, weekday } from '../lib/utils'
import { useClientMap, useDB } from '../store/data'
import { confirmDialog, openForm, toast } from '../store/ui'

type Period = 'today' | '7d' | 'month' | 'last'
type Tab = 'all' | 'receber' | 'pagar'

export default function Financeiro() {
  const transactions = useDB((s) => s.transactions)
  const receive = useDB((s) => s.receive)
  const cm = useClientMap()
  const [period, setPeriod] = useState<Period>('today')
  const [tab, setTab] = useState<Tab>('all')
  const [paying, setPaying] = useState<Transaction | null>(null)
  const today = todayISO()

  const range = useMemo((): [string, string] => {
    if (period === 'today') return [today, today]
    if (period === '7d') return [addDays(today, -6), today]
    if (period === 'month') return [today.slice(0, 8) + '01', today]
    const firstThis = today.slice(0, 8) + '01'
    const lastPrev = addDays(firstThis, -1)
    return [lastPrev.slice(0, 8) + '01', lastPrev]
  }, [period, today])

  const inRange = transactions.filter((t) => t.date >= range[0] && t.date <= range[1])
  const paid = inRange.filter((t) => t.status === 'pago')
  const ins = paid.filter((t) => t.type === 'in').reduce((s, t) => s + t.amount, 0)
  const outs = paid.filter((t) => t.type === 'out').reduce((s, t) => s + t.amount, 0)
  const toReceive = transactions.filter((t) => t.type === 'in' && t.status === 'pendente')
  const toPay = transactions.filter((t) => t.type === 'out' && t.status === 'pendente')

  const byMethod = useMemo(() => {
    const m = new Map<string, number>()
    paid.filter((t) => t.type === 'in').forEach((t) => m.set(t.method ?? 'Outro', (m.get(t.method ?? 'Outro') ?? 0) + t.amount))
    return [...m].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)
  }, [paid])
  const byExpense = useMemo(() => {
    const m = new Map<string, number>()
    paid.filter((t) => t.type === 'out').forEach((t) => m.set(t.category, (m.get(t.category) ?? 0) + t.amount))
    return [...m].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)
  }, [paid])

  const list = (tab === 'all' ? inRange : tab === 'receber' ? toReceive : toPay).slice().sort((a, b) =>
    tab === 'all' ? b.date.localeCompare(a.date) : (a.dueDate ?? a.date).localeCompare(b.dueDate ?? b.date),
  )
  const grouped = useMemo(() => {
    const g = new Map<string, Transaction[]>()
    list.forEach((t) => {
      const k = tab === 'all' ? t.date : t.dueDate ?? t.date
      g.set(k, [...(g.get(k) ?? []), t])
    })
    return [...g]
  }, [list, tab])

  const exportCSV = () => {
    const rows = [['Data', 'Tipo', 'Categoria', 'Descrição', 'Cliente', 'Forma', 'Situação', 'Valor'], ...inRange.map((t) => [fmtDate(t.date), t.type === 'in' ? 'Entrada' : 'Saída', t.category, t.description, cm.get(t.clientId ?? '')?.name ?? '', t.method ?? '', t.status, t.amount.toFixed(2).replace('.', ',')])]
    downloadFile(`financeiro-${range[0]}_${range[1]}.csv`, toCSV(rows))
    toast('Planilha exportada')
  }

  const payOut = async (t: Transaction) => {
    if (await confirmDialog({ title: 'Marcar como pago?', message: `${t.description} — ${money(t.amount)}`, confirmLabel: 'Marcar pago' })) {
      receive(t.id)
      toast('Despesa marcada como paga')
    }
  }

  return (
    <div>
      <PageHeader
        title="Financeiro"
        subtitle="Entradas, despesas e contas em aberto"
        actions={
          <>
            <span className="hidden sm:contents">
              <Button icon={Download} onClick={exportCSV}>
              Exportar
            </Button>
            </span>
            <Button variant="danger" icon={Minus} onClick={() => openForm({ kind: 'transaction', preset: { type: 'out' } })}>
              Despesa
            </Button>
            <Button variant="primary" icon={Plus} onClick={() => openForm({ kind: 'transaction', preset: { type: 'in' } })}>
              Entrada
            </Button>
          </>
        }
      />
      <Chips
        className="mb-4"
        value={period}
        onChange={setPeriod}
        options={[
          { value: 'today', label: 'Hoje' },
          { value: '7d', label: '7 dias' },
          { value: 'month', label: 'Este mês' },
          { value: 'last', label: 'Mês passado' },
        ]}
      />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Entradas" value={money(ins)} tone="green" />
        <Stat label="Saídas" value={money(outs)} tone="red" />
        <Stat label="Saldo do período" value={money(ins - outs)} tone={ins - outs >= 0 ? 'gold' : 'red'} />
        <Stat label="A receber" value={money(toReceive.reduce((s, t) => s + t.amount, 0))} sub={`${toReceive.length} conta(s) em aberto`} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="card overflow-hidden">
          <div className="flex gap-1 border-b border-line p-2">
            {(
              [
                ['all', 'Movimentações', 0],
                ['receber', 'A receber', toReceive.length],
                ['pagar', 'A pagar', toPay.length],
              ] as const
            ).map(([k, l, n]) => (
              <button key={k} onClick={() => setTab(k)} className={cn('flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg text-[13px] font-medium sm:flex-none sm:px-4', tab === k ? 'bg-surface-3 text-gold-300' : 'text-muted')}>
                {l}
                {!!n && <span className="rounded-full bg-white/10 px-1.5 text-[11px]">{n}</span>}
              </button>
            ))}
          </div>
          {!list.length ? (
            <Empty icon={Wallet} title={tab === 'all' ? 'Sem movimentações no período' : 'Nada em aberto 🎉'} />
          ) : (
            <div className="max-h-[640px] overflow-y-auto">
              {grouped.map(([date, items]) => (
                <div key={date}>
                  <p className="sticky top-0 z-10 flex justify-between bg-surface/95 px-4 py-2 text-[11.5px] font-medium uppercase tracking-wider text-subtle backdrop-blur">
                    <span>
                      {tab !== 'all' && (date < today ? 'Venceu ' : 'Vence ')}
                      {date === today ? 'Hoje' : `${weekday(date)}, ${fmtDate(date)}`}
                    </span>
                    {tab === 'all' && (
                      <span className="normal-case tracking-normal">
                        {money(items.reduce((s, t) => s + (t.status === 'pago' ? (t.type === 'in' ? t.amount : -t.amount) : 0), 0))}
                      </span>
                    )}
                  </p>
                  <ul className="divide-y divide-line/60">
                    {items.map((t) => {
                      const late = t.status === 'pendente' && (t.dueDate ?? t.date) < today
                      return (
                        <li key={t.id} className="flex items-center gap-3 px-4 py-3">
                          <button onClick={() => openForm({ kind: 'transaction', id: t.id })} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                            <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', t.type === 'in' ? 'bg-ok/12 text-green-400' : 'bg-danger/12 text-red-400')}>
                              {t.type === 'in' ? <ArrowDownLeft size={19} /> : <ArrowUpRight size={19} />}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[14px]">{t.clientId ? cm.get(t.clientId)?.name ?? t.description : t.description}</span>
                              <span className="block truncate text-[12px] text-muted">
                                {t.clientId ? t.description : t.category}
                                {t.method && ` · ${t.method}`}
                              </span>
                            </span>
                            <span className="text-right">
                              <span className={cn('block text-[14px] font-semibold tabular-nums', t.type === 'in' ? 'text-green-400' : 'text-red-400')}>
                                {t.type === 'in' ? '+' : '−'} {money(t.amount)}
                              </span>
                              {t.status === 'pendente' && (
                                <Badge tone={late ? 'red' : 'gold'} className="mt-0.5">
                                  {late ? 'Vencido' : 'Pendente'}
                                </Badge>
                              )}
                            </span>
                          </button>
                          {t.status === 'pendente' && (
                            <button
                              aria-label={t.type === 'in' ? 'Receber' : 'Pagar'}
                              title={t.type === 'in' ? 'Registrar recebimento' : 'Marcar como pago'}
                              onClick={() => (t.type === 'in' ? setPaying(t) : payOut(t))}
                              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-ok/30 text-green-400 hover:bg-ok/10"
                            >
                              <CheckCircle2 size={19} />
                            </button>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <Card title="Recebimentos por forma">{byMethod.length ? <HBars data={byMethod} /> : <p className="text-sm text-muted">Sem recebimentos no período.</p>}</Card>
          <Card title="Despesas por categoria">{byExpense.length ? <HBars data={byExpense} /> : <p className="text-sm text-muted">Sem despesas no período.</p>}</Card>
          <Button icon={Download} onClick={exportCSV} className="w-full sm:hidden">
            Exportar planilha (CSV)
          </Button>
        </div>
      </div>
      <PaySheet
        open={!!paying}
        pending
        total={paying?.amount ?? 0}
        onClose={() => setPaying(null)}
        onPick={(m) => {
          if (paying) {
            receive(paying.id, m)
            toast(`Recebido ${money(paying.amount)} via ${m}`)
          }
          setPaying(null)
        }}
      />
    </div>
  )
}
