import { useMemo, useState } from 'react'
import { Ban, CalendarClock, Check, ClipboardCheck, Clock3, MessageCircle, Pencil, Phone, Play, Plus, Receipt, Sparkles, Wallet } from 'lucide-react'
import type { PayMethod } from '../lib/types'
import { STATUS, STATUS_FLOW, cn, fmtDate, fmtPhone, fmtPlate, money, orderTotal, todayISO, weekday } from '../lib/utils'
import { buildMessage, openWhatsApp } from '../lib/wa'
import { useDB } from '../store/data'
import { confirmDialog, openForm, toast, useUI } from '../store/ui'
import { Avatar, Badge, Button, Plate, Sheet, VehicleThumb } from './ui'
import { METHODS } from './forms'

export function DetailHost() {
  const d = useUI((s) => s.detail)
  const close = () => useUI.getState().openDetail(null)
  if (!d) return null
  return d.kind === 'order' ? <OrderDetail id={d.id} onClose={close} /> : <ClientDetail id={d.id} onClose={close} />
}

/* ---------------- OS ---------------- */
function OrderDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const { orders, clients, vehicles, inspections, transactions, setOrderStatus, deliverOrder, receive } = useDB()
  const o = orders.find((x) => x.id === id)
  const [paying, setPaying] = useState(false)
  if (!o) return null
  const c = clients.find((x) => x.id === o.clientId)
  const v = vehicles.find((x) => x.id === o.vehicleId)
  const insp = inspections.find((i) => i.orderId === o.id)
  const tx = transactions.find((t) => t.orderId === o.id)
  const total = orderTotal(o)
  const stepIdx = o.status === 'entregue' ? STATUS_FLOW.length : STATUS_FLOW.indexOf(o.status)

  const next = () => {
    if (o.status === 'agendado') {
      setOrderStatus(o.id, 'andamento')
      toast('Serviço iniciado')
    } else if (o.status === 'andamento') {
      setOrderStatus(o.id, 'pronto')
      toast('Veículo pronto! Avise o cliente 📲')
    } else if (o.status === 'pronto') setPaying(true)
  }

  const nextLabel = { agendado: 'Iniciar serviço', andamento: 'Marcar como pronto', pronto: 'Entregar e receber' }[o.status as 'agendado']
  const NextIcon = { agendado: Play, andamento: Sparkles, pronto: Wallet }[o.status as 'agendado']

  return (
    <>
      <Sheet
        open
        onClose={onClose}
        size="md"
        title={
          <span className="flex items-center gap-2.5">
            OS #{o.number} <Badge tone={STATUS[o.status].tone} dot>{STATUS[o.status].label}</Badge>
          </span>
        }
        subtitle={
          <span className="inline-flex items-center gap-1.5 capitalize">
            <CalendarClock size={14} /> {weekday(o.date, 'long')}, {fmtDate(o.date)} às {o.time}
          </span>
        }
        footer={
          o.status !== 'entregue' && o.status !== 'cancelado' ? (
            <Button variant="primary" size="lg" icon={NextIcon} onClick={next} className="sm:!flex-1">
              {nextLabel}
            </Button>
          ) : tx?.status === 'pendente' ? (
            <Button variant="primary" size="lg" icon={Wallet} className="sm:!flex-1" onClick={() => setPaying(true)}>
              Registrar recebimento
            </Button>
          ) : undefined
        }
      >
        {o.status !== 'cancelado' && (
          <div className="mb-5 mt-1 flex items-center">
            {STATUS_FLOW.map((s, i) => (
              <div key={s} className={cn('flex items-center', i < STATUS_FLOW.length - 1 && 'flex-1')}>
                <div className="flex flex-col items-center gap-1.5">
                  <span
                    className={cn(
                      'grid h-8 w-8 place-items-center rounded-full text-xs font-bold ring-2 transition',
                      i < stepIdx ? 'bg-gold-500 text-black ring-gold-500' : i === stepIdx ? 'bg-gold-500/15 text-gold-300 ring-gold-500' : 'bg-surface-2 text-subtle ring-line-2',
                    )}
                  >
                    {i < stepIdx ? <Check size={15} strokeWidth={3} /> : i + 1}
                  </span>
                  <span className={cn('text-[10.5px] whitespace-nowrap', i <= stepIdx ? 'text-fg' : 'text-subtle')}>{STATUS[s].label}</span>
                </div>
                {i < STATUS_FLOW.length - 1 && <span className={cn('mx-1 mb-5 h-0.5 flex-1 rounded', i < stepIdx ? 'bg-gold-500' : 'bg-line-2')} />}
              </div>
            ))}
          </div>
        )}

        <div className="space-y-3">
          <button onClick={() => c && useUI.getState().openDetail({ kind: 'client', id: c.id })} className="flex w-full items-center gap-3 rounded-2xl border border-line bg-ink/40 p-3 text-left hover:border-line-2">
            <Avatar name={c?.name ?? '?'} size={42} />
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{c?.name ?? 'Cliente removido'}</span>
              <span className="block text-[13px] text-muted">{c ? fmtPhone(c.phone) : ''}</span>
            </span>
          </button>
          <div className="flex items-center gap-3 rounded-2xl border border-line bg-ink/40 p-3">
            <VehicleThumb v={v} size={40} />
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">
                {v ? `${v.brand} ${v.model}` : 'Veículo removido'} {v?.year && <span className="font-normal text-muted">{v.year}</span>}
              </span>
              <span className="mt-0.5 flex items-center gap-2 text-[13px] text-muted">
                {v && <Plate plate={fmtPlate(v.plate)} />} {v?.color}
              </span>
            </span>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-line bg-ink/40 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-subtle">Serviços</p>
          <ul className="space-y-2">
            {o.items.map((it, i) => (
              <li key={i} className="flex justify-between gap-3 text-sm">
                <span>{it.name}</span>
                <span className="tabular-nums text-muted">{money(it.price * it.qty)}</span>
              </li>
            ))}
            {!!o.discount && (
              <li className="flex justify-between text-sm text-green-400">
                <span>Desconto</span>
                <span>-{money(o.discount)}</span>
              </li>
            )}
          </ul>
          <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
            <span className="text-sm">
              Total
              {o.status === 'entregue' && (
                <span className="ml-2">
                  {o.paid ? <Badge tone="green">Pago · {o.payMethod}</Badge> : <Badge tone="gold">A receber</Badge>}
                </span>
              )}
            </span>
            <span className="font-display text-2xl font-semibold text-gold-gradient">{money(total)}</span>
          </div>
        </div>
        {o.notes && <p className="mt-3 rounded-2xl border border-line bg-ink/40 p-3.5 text-sm text-muted">📝 {o.notes}</p>}

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Action
            icon={MessageCircle}
            label={o.status === 'pronto' ? 'Avisar pronto' : 'Lembrete'}
            green
            onClick={() => c && openWhatsApp(c.phone, buildMessage(o.status === 'pronto' || o.status === 'entregue' ? 't2' : 't1', { client: c, vehicle: v, order: o }))}
          />
          <Action
            icon={ClipboardCheck}
            label={insp ? 'Ver vistoria' : 'Vistoria'}
            onClick={() => openForm({ kind: 'inspection', id: insp?.id, preset: { clientId: o.clientId, vehicleId: o.vehicleId, orderId: o.id } })}
          />
          <Action icon={Pencil} label="Editar" onClick={() => openForm({ kind: 'order', id: o.id })} />
          {o.status !== 'cancelado' && o.status !== 'entregue' ? (
            <Action
              icon={Ban}
              label="Cancelar"
              danger
              onClick={async () => {
                if (await confirmDialog({ title: `Cancelar OS #${o.number}?`, danger: true, confirmLabel: 'Cancelar OS' })) {
                  setOrderStatus(o.id, 'cancelado')
                  toast('OS cancelada', 'info')
                }
              }}
            />
          ) : o.status === 'cancelado' ? (
            <Action icon={CalendarClock} label="Reabrir" onClick={() => (setOrderStatus(o.id, 'agendado'), toast('OS reaberta'))} />
          ) : (
            <Action icon={Receipt} label="Recibo" onClick={() => c && openWhatsApp(c.phone, receiptText(o.number, c.name, o.items, total, o.payMethod))} />
          )}
        </div>
      </Sheet>
      <PaySheet
        open={paying}
        total={total}
        onClose={() => setPaying(false)}
        pending={o.status === 'entregue'}
        onPick={(m) => {
          if (o.status === 'entregue' && tx) receive(tx.id, m)
          else deliverOrder(o.id, m)
          setPaying(false)
          toast(m === 'A prazo' ? 'Entregue — lançado em contas a receber' : `Recebido ${money(total)} via ${m}`)
        }}
      />
    </>
  )
}

const receiptText = (n: number, name: string, items: { name: string; price: number; qty: number }[], total: number, m?: string) =>
  `*Recibo — OS #${n}*\nCliente: ${name}\n\n${items.map((i) => `• ${i.name} — ${money(i.price * i.qty)}`).join('\n')}\n\n*Total: ${money(total)}*${m ? `\nPagamento: ${m}` : ''}\nData: ${fmtDate(todayISO())}\n\nObrigado pela preferência! 💛`

function Action({ icon: Icon, label, onClick, green, danger }: { icon: typeof Pencil; label: string; onClick: () => void; green?: boolean; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 text-[12.5px] font-medium transition active:scale-95',
        danger ? 'border-danger/25 text-red-300 hover:bg-danger/10' : 'border-line-2 bg-ink/40 hover:border-gold-500/50',
      )}
    >
      <Icon size={20} className={green ? 'text-[#25d366]' : danger ? 'text-red-400' : 'text-gold-400'} />
      {label}
    </button>
  )
}

export function PaySheet({ open, onClose, onPick, total, pending }: { open: boolean; onClose: () => void; onPick: (m: PayMethod) => void; total: number; pending?: boolean }) {
  return (
    <Sheet open={open} onClose={onClose} title={pending ? 'Registrar recebimento' : 'Forma de pagamento'} subtitle={`Total: ${money(total)}`} size="sm">
      <div className="grid grid-cols-2 gap-2.5">
        {METHODS.filter((m) => !pending || m !== 'A prazo').map((m) => (
          <button
            key={m}
            onClick={() => onPick(m)}
            className={cn(
              'h-16 rounded-2xl border text-[15px] font-semibold transition active:scale-95',
              m === 'A prazo' ? 'col-span-2 border-dashed border-gold-500/40 text-gold-300' : 'border-line-2 bg-ink/40 hover:border-gold-500',
            )}
          >
            {m === 'A prazo' ? 'Fiado / a prazo (lançar em contas a receber)' : m}
          </button>
        ))}
      </div>
    </Sheet>
  )
}

/* ---------------- Cliente ---------------- */
function ClientDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const { clients, vehicles, orders, transactions } = useDB()
  const c = clients.find((x) => x.id === id)
  const own = vehicles.filter((v) => v.clientId === id)
  const hist = useMemo(() => orders.filter((o) => o.clientId === id).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)), [orders, id])
  if (!c) return null
  const done = hist.filter((o) => o.status === 'entregue')
  const spent = done.reduce((s, o) => s + orderTotal(o), 0)
  const pending = transactions.filter((t) => t.clientId === id && t.status === 'pendente' && t.type === 'in').reduce((s, t) => s + t.amount, 0)
  const vm = new Map(vehicles.map((v) => [v.id, v]))

  return (
    <Sheet
      open
      onClose={onClose}
      size="md"
      title="Cliente"
      footer={
        <>
          <Button icon={Pencil} onClick={() => openForm({ kind: 'client', id: c.id })} className="!flex-none">
            <span className="hidden sm:inline">Editar</span>
          </Button>
          <Button variant="primary" icon={CalendarClock} onClick={() => openForm({ kind: 'order', preset: { clientId: c.id, vehicleId: own[0]?.id } })}>
            Agendar serviço
          </Button>
        </>
      }
    >
      <div className="flex items-center gap-4">
        <Avatar name={c.name} size={60} />
        <div className="min-w-0">
          <p className="truncate text-xl font-semibold">{c.name}</p>
          <p className="text-sm text-muted">{fmtPhone(c.phone)}</p>
          <p className="text-xs text-subtle">Cliente desde {fmtDate(c.createdAt)}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button variant="whatsapp" icon={MessageCircle} onClick={() => openWhatsApp(c.phone, `Olá, ${c.name.split(' ')[0]}! `)}>
          WhatsApp
        </Button>
        <a href={`tel:${c.phone.replace(/\D/g, '')}`} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-line-2 bg-surface-3 text-sm font-semibold">
          <Phone size={18} /> Ligar
        </a>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Mini label="Total gasto" value={money(spent)} />
        <Mini label="Visitas" value={String(done.length)} />
        <Mini label="A receber" value={money(pending)} warn={pending > 0} />
      </div>
      {c.notes && <p className="mt-3 rounded-xl border border-line bg-ink/40 p-3 text-sm text-muted">📝 {c.notes}</p>}

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-subtle">Veículos</p>
          <button className="inline-flex items-center gap-1 text-[13px] text-gold-400" onClick={() => openForm({ kind: 'vehicle', preset: { clientId: c.id } })}>
            <Plus size={14} /> Adicionar
          </button>
        </div>
        <div className="space-y-2">
          {own.map((v) => (
            <button key={v.id} onClick={() => openForm({ kind: 'vehicle', id: v.id })} className="flex w-full items-center gap-3 rounded-xl border border-line bg-ink/40 p-2.5 text-left hover:border-line-2">
              <VehicleThumb v={v} size={36} />
              <span className="flex-1 text-sm font-medium">
                {v.brand} {v.model} <span className="text-muted">{v.year}</span>
              </span>
              <Plate plate={fmtPlate(v.plate)} />
            </button>
          ))}
          {!own.length && <p className="text-sm text-muted">Nenhum veículo cadastrado.</p>}
        </div>
      </div>

      <div className="mt-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-subtle">Histórico ({hist.length})</p>
        <ul className="divide-y divide-line">
          {hist.slice(0, 12).map((o) => (
            <li key={o.id}>
              <button onClick={() => useUI.getState().openDetail({ kind: 'order', id: o.id })} className="flex w-full items-center gap-3 py-2.5 text-left">
                <Clock3 size={16} className="shrink-0 text-subtle" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{o.items.map((i) => i.name).join(' + ')}</span>
                  <span className="block text-xs text-muted">
                    {fmtDate(o.date)} · {vm.get(o.vehicleId)?.model ?? '—'}
                  </span>
                </span>
                <span className="text-right">
                  <span className="block text-sm font-semibold tabular-nums">{money(orderTotal(o))}</span>
                  <Badge tone={STATUS[o.status].tone} className="mt-0.5">
                    {STATUS[o.status].label}
                  </Badge>
                </span>
              </button>
            </li>
          ))}
          {!hist.length && <p className="py-3 text-sm text-muted">Sem serviços ainda.</p>}
        </ul>
      </div>
    </Sheet>
  )
}
function Mini({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-ink/40 px-2 py-2.5">
      <p className="text-[11px] text-muted">{label}</p>
      <p className={cn('mt-0.5 truncate text-[14px] font-semibold tabular-nums', warn && 'text-gold-300')}>{value}</p>
    </div>
  )
}
