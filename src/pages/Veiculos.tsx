import { useMemo, useState } from 'react'
import { Car, Plus } from 'lucide-react'
import { Button, Chips, Empty, PageHeader, Plate, SearchInput, VehicleThumb } from '../components/ui'
import type { Vehicle } from '../lib/types'
import { fmtDate, fmtPlate, normalize } from '../lib/utils'
import { useClientMap, useDB } from '../store/data'
import { openForm, useUI } from '../store/ui'

export default function Veiculos() {
  const vehicles = useDB((s) => s.vehicles)
  const orders = useDB((s) => s.orders)
  const cm = useClientMap()
  const openDetail = useUI((s) => s.openDetail)
  const [q, setQ] = useState('')
  const [type, setType] = useState<'all' | Vehicle['type']>('all')

  const rows = useMemo(() => {
    const n = normalize(q).replace('-', '')
    const stats = new Map<string, { count: number; last?: string; inShop: boolean }>()
    orders.forEach((o) => {
      const s = stats.get(o.vehicleId) ?? { count: 0, inShop: false }
      if (o.status === 'entregue') {
        s.count++
        if ((s.last ?? '') < o.date) s.last = o.date
      }
      if (o.status === 'andamento' || o.status === 'pronto') s.inShop = true
      stats.set(o.vehicleId, s)
    })
    return vehicles
      .filter((v) => (type === 'all' || v.type === type) && (!n || normalize(`${v.plate} ${v.brand} ${v.model} ${cm.get(v.clientId)?.name ?? ''}`).includes(n)))
      .map((v) => ({ v, s: stats.get(v.id) }))
      .sort((a, b) => Number(b.s?.inShop ?? 0) - Number(a.s?.inShop ?? 0) || a.v.model.localeCompare(b.v.model))
  }, [vehicles, orders, q, type, cm])

  const count = (t: Vehicle['type']) => vehicles.filter((v) => v.type === t).length

  return (
    <div>
      <PageHeader
        title="Veículos"
        subtitle={`${vehicles.length} veículos cadastrados`}
        actions={
          <Button variant="primary" icon={Plus} onClick={() => openForm({ kind: 'vehicle' })}>
            Novo veículo
          </Button>
        }
      />
      <div className="mb-4 space-y-3 sm:flex sm:items-center sm:gap-3 sm:space-y-0">
        <div className="sm:w-96">
          <SearchInput value={q} onChange={setQ} placeholder="Placa, modelo ou proprietário" />
        </div>
        <Chips
          value={type}
          onChange={setType}
          options={[
            { value: 'all', label: 'Todos', count: vehicles.length },
            { value: 'carro', label: 'Carros', count: count('carro') },
            { value: 'suv', label: 'SUVs', count: count('suv') },
            { value: 'picape', label: 'Picapes', count: count('picape') },
            { value: 'moto', label: 'Motos', count: count('moto') },
          ]}
        />
      </div>
      {!rows.length ? (
        <div className="card">
          <Empty icon={Car} title="Nenhum veículo encontrado" action={<Button variant="primary" icon={Plus} onClick={() => openForm({ kind: 'vehicle' })}>Cadastrar veículo</Button>} />
        </div>
      ) : (
        <ul className="grid gap-2.5 sm:grid-cols-2 2xl:grid-cols-3">
          {rows.map(({ v, s }) => {
            const c = cm.get(v.clientId)
            return (
              <li key={v.id} className="card p-3 transition hover:border-gold-500/40">
                <button onClick={() => openForm({ kind: 'vehicle', id: v.id })} className="flex w-full items-center gap-3 text-left">
                  <VehicleThumb v={v} size={48} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-medium">
                        {v.brand} {v.model}
                      </span>
                      {s?.inShop && <span className="rounded-full bg-info/15 px-2 py-px text-[10.5px] font-semibold text-blue-300">no pátio</span>}
                    </span>
                    <span className="mt-0.5 flex items-center gap-2 text-[12.5px] text-muted">
                      <Plate plate={fmtPlate(v.plate)} />
                      {v.year} · {v.color}
                    </span>
                  </span>
                </button>
                <div className="mt-2.5 flex items-center justify-between border-t border-line pt-2.5 text-[12.5px]">
                  <button onClick={() => c && openDetail({ kind: 'client', id: c.id })} className="truncate text-gold-300 hover:underline">
                    {c?.name ?? '—'}
                  </button>
                  <span className="shrink-0 text-subtle">
                    {s?.count ?? 0} serviço(s){s?.last && ` · último ${fmtDate(s.last)}`}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
