import { useMemo, useState } from 'react'
import { ArrowRightLeft, ClipboardList, FilePlus2, FileText, MessageCircle, Plus } from 'lucide-react'
import { Badge, Button, Chips, Empty, Field, Input, PageHeader, SearchInput, Sheet } from '../components/ui'
import type { OrderStatus, Quote, QuoteStatus } from '../lib/types'
import { STATUS, cn, fmtDate, fmtDayMonth, fmtPlate, money, normalize, orderTitle, orderTotal, todayISO, addDays, type Tone } from '../lib/utils'
import { buildMessage, openWhatsApp } from '../lib/wa'
import { useClientMap, useDB, useVehicleMap } from '../store/data'
import { openForm, toast, useUI } from '../store/ui'

export default function OS() {
  const [tab, setTab] = useState<'os' | 'quotes'>(() => (location.hash.includes('orc') ? 'quotes' : 'os'))
  const quotes = useDB((s) => s.quotes)
  const pendingQuotes = quotes.filter((q) => q.status === 'pendente' || q.status === 'aprovado').length
  return (
    <div>
      <PageHeader
        title="Orçamentos / OS"
        subtitle="Ordens de serviço e orçamentos enviados"
        actions={
          <>
            <Button icon={FilePlus2} onClick={() => openForm({ kind: 'quote' })}>
              Orçamento
            </Button>
            <Button variant="primary" icon={Plus} onClick={() => openForm({ kind: 'order', preset: { now: true } })}>
              Nova OS
            </Button>
          </>
        }
      />
      <div className="mb-4 grid grid-cols-2 gap-1 rounded-2xl border border-line bg-surface p-1 sm:inline-grid sm:w-auto">
        {(
          [
            ['os', 'Ordens (OS)', ClipboardList, 0],
            ['quotes', 'Orçamentos', FileText, pendingQuotes],
          ] as const
        ).map(([k, l, I, n]) => (
          <button key={k} onClick={() => setTab(k)} className={cn('flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-[13.5px] font-medium transition', tab === k ? 'bg-surface-3 text-gold-300' : 'text-muted')}>
            <I size={17} /> {l}
            {!!n && <span className="rounded-full bg-gold-500 px-1.5 text-[11px] font-bold text-black">{n}</span>}
          </button>
        ))}
      </div>
      {tab === 'os' ? <OrdersList /> : <QuotesList />}
    </div>
  )
}

function OrdersList() {
  const orders = useDB((s) => s.orders)
  const cm = useClientMap()
  const vm = useVehicleMap()
  const open = useUI((s) => s.openDetail)
  const [q, setQ] = useState('')
  const [st, setSt] = useState<'all' | OrderStatus>('all')
  const [limit, setLimit] = useState(25)

  const filtered = useMemo(() => {
    const n = normalize(q).replace('#', '')
    return orders
      .filter((o) => (st === 'all' || o.status === st) && (!n || normalize(`${o.number} ${cm.get(o.clientId)?.name ?? ''} ${vm.get(o.vehicleId)?.plate ?? ''} ${orderTitle(o)}`).includes(n)))
      .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
  }, [orders, q, st, cm, vm])
  const count = (s: OrderStatus) => orders.filter((o) => o.status === s).length

  return (
    <>
      <div className="mb-3 space-y-3">
        <div className="sm:w-96">
          <SearchInput value={q} onChange={setQ} placeholder="Nº da OS, cliente, placa ou serviço" />
        </div>
        <Chips
          value={st}
          onChange={(v) => (setSt(v), setLimit(25))}
          options={[{ value: 'all' as const, label: 'Todas', count: orders.length }, ...(Object.keys(STATUS) as OrderStatus[]).map((s) => ({ value: s, label: STATUS[s].label, count: count(s) }))]}
        />
      </div>
      {!filtered.length ? (
        <div className="card">
          <Empty icon={ClipboardList} title="Nenhuma OS encontrada" />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="hidden grid-cols-[70px_minmax(0,1.2fr)_minmax(0,1.4fr)_110px_110px_120px] gap-3 border-b border-line px-4 py-2.5 text-[11.5px] font-medium uppercase tracking-wider text-subtle md:grid">
            <span>OS</span>
            <span>Cliente / veículo</span>
            <span>Serviço</span>
            <span>Data</span>
            <span className="text-right">Valor</span>
            <span className="text-right">Status</span>
          </div>
          <ul className="divide-y divide-line/70">
            {filtered.slice(0, limit).map((o) => {
              const c = cm.get(o.clientId)
              const v = vm.get(o.vehicleId)
              return (
                <li key={o.id}>
                  <button
                    onClick={() => open({ kind: 'order', id: o.id })}
                    className="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 px-4 py-3 text-left transition hover:bg-white/[0.03] md:grid-cols-[70px_minmax(0,1.2fr)_minmax(0,1.4fr)_110px_110px_120px] md:items-center"
                  >
                    <span className="hidden font-display font-semibold text-gold-300 md:block">#{o.number}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] font-medium">
                        <span className="text-gold-300 md:hidden">#{o.number} · </span>
                        {c?.name ?? '—'}
                      </span>
                      <span className="block truncate text-[12.5px] text-muted">{v ? `${v.model} · ${fmtPlate(v.plate)}` : '—'}</span>
                      <span className="block truncate text-[12.5px] text-subtle md:hidden">
                        {orderTitle(o)} · {fmtDayMonth(o.date)} {o.time}
                      </span>
                    </span>
                    <span className="hidden truncate text-[13.5px] text-fg/85 md:block">{orderTitle(o)}</span>
                    <span className="hidden text-[13px] tabular-nums text-muted md:block">
                      {fmtDate(o.date)}
                      <span className="block text-[11.5px] text-subtle">{o.time}</span>
                    </span>
                    <span className="row-span-2 flex flex-col items-end justify-center gap-1 md:contents">
                      <span className="text-right text-[14px] font-semibold tabular-nums">{money(orderTotal(o))}</span>
                      <span className="text-right">
                        <Badge tone={STATUS[o.status].tone}>{STATUS[o.status].label}</Badge>
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          {filtered.length > limit && (
            <button onClick={() => setLimit(limit + 25)} className="w-full border-t border-line py-3 text-sm font-medium text-gold-400 hover:bg-white/[0.02]">
              Carregar mais ({filtered.length - limit} restantes)
            </button>
          )}
        </div>
      )}
    </>
  )
}

const Q_STATUS: Record<QuoteStatus, { label: string; tone: Tone }> = {
  pendente: { label: 'Aguardando', tone: 'gold' },
  aprovado: { label: 'Aprovado', tone: 'green' },
  recusado: { label: 'Recusado', tone: 'red' },
  convertido: { label: 'Virou OS', tone: 'violet' },
}

function QuotesList() {
  const quotes = useDB((s) => s.quotes)
  const cm = useClientMap()
  const vm = useVehicleMap()
  const [convert, setConvert] = useState<Quote | null>(null)
  const sorted = [...quotes].sort((a, b) => b.number - a.number)
  const today = todayISO()
  if (!quotes.length)
    return (
      <div className="card">
        <Empty icon={FileText} title="Nenhum orçamento" text="Crie orçamentos e envie direto pelo WhatsApp." action={<Button variant="primary" icon={FilePlus2} onClick={() => openForm({ kind: 'quote' })}>Novo orçamento</Button>} />
      </div>
    )
  return (
    <>
      <ul className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
        {sorted.map((q) => {
          const c = cm.get(q.clientId)
          const v = vm.get(q.vehicleId)
          const expired = q.status === 'pendente' && q.validUntil < today
          const st = Q_STATUS[q.status]
          return (
            <li key={q.id} className="card flex flex-col p-4">
              <button onClick={() => openForm({ kind: 'quote', id: q.id })} className="text-left">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[12px] text-subtle">Orçamento #{q.number}</p>
                    <p className="truncate font-semibold">{c?.name ?? '—'}</p>
                    <p className="truncate text-[12.5px] text-muted">{v ? `${v.brand} ${v.model} · ${fmtPlate(v.plate)}` : ''}</p>
                  </div>
                  <Badge tone={expired ? 'red' : st.tone}>{expired ? 'Vencido' : st.label}</Badge>
                </div>
                <ul className="mt-3 space-y-1 text-[13px] text-fg/80">
                  {q.items.map((i, k) => (
                    <li key={k} className="flex justify-between gap-2">
                      <span className="truncate">{i.name}</span>
                      <span className="tabular-nums text-muted">{money(i.price * i.qty)}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex items-end justify-between border-t border-line pt-3">
                  <span className="text-[12px] text-subtle">Válido até {fmtDate(q.validUntil)}</span>
                  <span className="font-display text-xl font-semibold text-gold-gradient">{money(orderTotal(q))}</span>
                </div>
              </button>
              {q.status !== 'convertido' && q.status !== 'recusado' && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button size="sm" variant="whatsapp" icon={MessageCircle} onClick={() => c && openWhatsApp(c.phone, buildMessage('t3', { client: c, vehicle: v, order: q }))}>
                    Enviar
                  </Button>
                  <Button size="sm" variant="outline" icon={ArrowRightLeft} onClick={() => setConvert(q)}>
                    Virar OS
                  </Button>
                </div>
              )}
            </li>
          )
        })}
      </ul>
      {convert && <ConvertSheet q={convert} onClose={() => setConvert(null)} />}
    </>
  )
}

function ConvertSheet({ q, onClose }: { q: Quote; onClose: () => void }) {
  const convertQuote = useDB((s) => s.convertQuote)
  const openDetail = useUI((s) => s.openDetail)
  const [date, setDate] = useState(addDays(todayISO(), 1))
  const [time, setTime] = useState('09:00')
  return (
    <Sheet
      open
      onClose={onClose}
      size="sm"
      title={`Agendar orçamento #${q.number}`}
      subtitle="O orçamento vira uma OS agendada"
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button
            variant="primary"
            onClick={() => {
              const o = convertQuote(q.id, date, time)
              onClose()
              if (o) {
                toast(`OS #${o.number} agendada para ${fmtDate(date)}`)
                openDetail({ kind: 'order', id: o.id })
              }
            }}
          >
            Criar OS
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Data">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Horário">
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </Field>
      </div>
    </Sheet>
  )
}
