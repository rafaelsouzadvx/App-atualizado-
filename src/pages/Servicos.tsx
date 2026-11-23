import { useMemo, useState } from 'react'
import { Clock3, Plus, Wrench } from 'lucide-react'
import { Button, Chips, Empty, PageHeader } from '../components/ui'
import { Switch } from '../components/forms'
import type { Service } from '../lib/types'
import { cn, money, todayISO } from '../lib/utils'
import { useDB } from '../store/data'
import { openForm, toast } from '../store/ui'

const CATS: Service['category'][] = ['Lavagem', 'Higienização', 'Estética', 'Proteção', 'Outros']
const dur = (m: number) => (!m ? '—' : m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${m % 60 ? `${m % 60}` : ''}`)

export default function Servicos() {
  const services = useDB((s) => s.services)
  const orders = useDB((s) => s.orders)
  const upsert = useDB((s) => s.upsert)
  const [cat, setCat] = useState<'all' | Service['category']>('all')
  const month = todayISO().slice(0, 7)

  const sold = useMemo(() => {
    const m = new Map<string, number>()
    orders.forEach((o) => o.status === 'entregue' && o.date.startsWith(month) && o.items.forEach((i) => i.serviceId && m.set(i.serviceId, (m.get(i.serviceId) ?? 0) + i.qty)))
    return m
  }, [orders, month])

  const groups = CATS.filter((c) => cat === 'all' || c === cat)
    .map((c) => ({ c, items: services.filter((s) => s.category === c) }))
    .filter((g) => g.items.length)

  return (
    <div>
      <PageHeader
        title="Serviços"
        subtitle="Tabela de preços e tempo médio de cada serviço"
        actions={
          <Button variant="primary" icon={Plus} onClick={() => openForm({ kind: 'service' })}>
            Novo serviço
          </Button>
        }
      />
      <Chips
        className="mb-4"
        value={cat}
        onChange={setCat}
        options={[{ value: 'all' as const, label: 'Todos', count: services.length }, ...CATS.map((c) => ({ value: c, label: c, count: services.filter((s) => s.category === c).length }))]}
      />
      {!groups.length && (
        <div className="card">
          <Empty icon={Wrench} title="Nenhum serviço" action={<Button variant="primary" icon={Plus} onClick={() => openForm({ kind: 'service' })}>Cadastrar serviço</Button>} />
        </div>
      )}
      <div className="space-y-6">
        {groups.map((g) => (
          <section key={g.c}>
            <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-subtle">{g.c}</h2>
            <ul className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
              {g.items.map((s) => (
                <li key={s.id} className={cn('card flex items-center gap-3 p-4 transition hover:border-gold-500/40', !s.active && 'opacity-55')}>
                  <button onClick={() => openForm({ kind: 'service', id: s.id })} className="min-w-0 flex-1 text-left">
                    <p className="truncate font-medium">{s.name}</p>
                    <p className="mt-1 flex items-center gap-3 text-[12.5px] text-muted">
                      <span className="font-display text-lg font-semibold text-gold-300">{money(s.price)}</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock3 size={13} /> {dur(s.duration)}
                      </span>
                    </p>
                    <p className="mt-0.5 text-[11.5px] text-subtle">{sold.get(s.id) ?? 0} vendidos este mês</p>
                  </button>
                  <Switch
                    checked={s.active}
                    onChange={(v) => {
                      upsert('services', { ...s, active: v })
                      toast(v ? `${s.name} ativado` : `${s.name} desativado`, 'info')
                    }}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
