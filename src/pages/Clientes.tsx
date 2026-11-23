import { useMemo, useState } from 'react'
import { MessageCircle, UserPlus, Users } from 'lucide-react'
import { Avatar, Button, Chips, Empty, PageHeader, Plate, SearchInput } from '../components/ui'
import { fmtPhone, fmtPlate, money, normalize, orderTotal } from '../lib/utils'
import { openWhatsApp } from '../lib/wa'
import { useDB } from '../store/data'
import { openForm, useUI } from '../store/ui'

type Sort = 'az' | 'recent' | 'top'

export default function Clientes() {
  const clients = useDB((s) => s.clients)
  const vehicles = useDB((s) => s.vehicles)
  const orders = useDB((s) => s.orders)
  const open = useUI((s) => s.openDetail)
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<Sort>('az')

  const rows = useMemo(() => {
    const spent = new Map<string, number>()
    const last = new Map<string, string>()
    orders.forEach((o) => {
      if (o.status === 'entregue') spent.set(o.clientId, (spent.get(o.clientId) ?? 0) + orderTotal(o))
      if (o.status !== 'cancelado' && (last.get(o.clientId) ?? '') < o.date) last.set(o.clientId, o.date)
    })
    const n = normalize(q)
    const list = clients
      .filter((c) => !n || normalize(`${c.name} ${c.phone} ${vehicles.filter((v) => v.clientId === c.id).map((v) => v.plate + v.model).join(' ')}`).includes(n))
      .map((c) => ({ c, vs: vehicles.filter((v) => v.clientId === c.id), spent: spent.get(c.id) ?? 0, last: last.get(c.id) }))
    if (sort === 'az') list.sort((a, b) => a.c.name.localeCompare(b.c.name))
    if (sort === 'recent') list.sort((a, b) => (b.last ?? '').localeCompare(a.last ?? ''))
    if (sort === 'top') list.sort((a, b) => b.spent - a.spent)
    return list
  }, [clients, vehicles, orders, q, sort])

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle={`${clients.length} clientes cadastrados`}
        actions={
          <Button variant="primary" icon={UserPlus} onClick={() => openForm({ kind: 'client' })}>
            Novo cliente
          </Button>
        }
      />
      <div className="mb-4 space-y-3 sm:flex sm:items-center sm:gap-3 sm:space-y-0">
        <div className="sm:w-96">
          <SearchInput value={q} onChange={setQ} placeholder="Nome, telefone ou placa" />
        </div>
        <Chips
          value={sort}
          onChange={setSort}
          options={[
            { value: 'az', label: 'A–Z' },
            { value: 'recent', label: 'Visitas recentes' },
            { value: 'top', label: 'Quem mais gasta' },
          ]}
        />
      </div>

      {!rows.length ? (
        <div className="card">
          <Empty
            icon={Users}
            title={q ? 'Nenhum cliente encontrado' : 'Nenhum cliente ainda'}
            text={q ? 'Tente buscar por outro nome, telefone ou placa.' : 'Cadastre seu primeiro cliente para começar.'}
            action={!q && <Button variant="primary" icon={UserPlus} onClick={() => openForm({ kind: 'client' })}>Cadastrar cliente</Button>}
          />
        </div>
      ) : (
        <ul className="grid gap-2.5 md:grid-cols-2 2xl:grid-cols-3">
          {rows.map(({ c, vs, spent }) => (
            <li key={c.id} className="card flex items-center gap-3 p-3 transition hover:border-gold-500/40">
              <button onClick={() => open({ kind: 'client', id: c.id })} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <Avatar name={c.name} size={44} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{c.name}</span>
                  <span className="block text-[13px] text-muted">{fmtPhone(c.phone)}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-1.5">
                    {vs.slice(0, 2).map((v) => (
                      <span key={v.id} className="inline-flex items-center gap-1 text-[11.5px] text-subtle">
                        {v.model} <Plate plate={fmtPlate(v.plate)} />
                      </span>
                    ))}
                    {!vs.length && <span className="text-[11.5px] text-subtle">sem veículo</span>}
                  </span>
                </span>
                <span className="hidden text-right sm:block">
                  <span className="block text-[11px] text-subtle">Total gasto</span>
                  <span className="block text-sm font-semibold tabular-nums text-gold-300">{money(spent)}</span>
                </span>
              </button>
              <button
                aria-label={`WhatsApp de ${c.name}`}
                onClick={() => openWhatsApp(c.phone, `Olá, ${c.name.split(' ')[0]}! `)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#1faa59]/15 text-[#25d366] transition hover:bg-[#1faa59]/25"
              >
                <MessageCircle size={19} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
