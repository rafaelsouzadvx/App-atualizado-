import { useMemo, useState } from 'react'
import { Minus, Package, PackagePlus, Plus, ShoppingCart } from 'lucide-react'
import { Badge, Button, Chips, Empty, PageHeader, SearchInput, Stat } from '../components/ui'
import { cn, money, normalize } from '../lib/utils'
import { useDB } from '../store/data'
import { openForm, toast } from '../store/ui'

export default function Estoque() {
  const products = useDB((s) => s.products)
  const adjust = useDB((s) => s.adjustStock)
  const [filter, setFilter] = useState<'all' | 'low'>('all')
  const [q, setQ] = useState('')
  const low = products.filter((p) => p.qty <= p.minQty)
  const value = products.reduce((s, p) => s + p.qty * p.cost, 0)
  const list = useMemo(
    () =>
      products
        .filter((p) => (filter === 'all' || p.qty <= p.minQty) && (!q || normalize(p.name + p.category).includes(normalize(q))))
        .sort((a, b) => Number(b.qty <= b.minQty) - Number(a.qty <= a.minQty) || a.name.localeCompare(b.name)),
    [products, filter, q],
  )

  const shoppingList = () => {
    if (!low.length) return toast('Nenhum produto abaixo do mínimo 🎉', 'info')
    const text = `*Lista de compras — JAT Wash*\n\n${low.map((p) => `• ${p.name}: comprar ${Math.max(p.minQty * 2 - p.qty, 1)} ${p.unit}`).join('\n')}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
  }

  return (
    <div>
      <PageHeader
        title="Estoque"
        subtitle="Produtos e materiais de consumo"
        actions={
          <>
            <Button icon={ShoppingCart} onClick={shoppingList}>
              Lista de compras
            </Button>
            <Button variant="primary" icon={PackagePlus} onClick={() => openForm({ kind: 'product' })}>
              Produto
            </Button>
          </>
        }
      />
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Produtos" value={String(products.length)} />
        <Stat label="Abaixo do mínimo" value={String(low.length)} tone={low.length ? 'red' : 'green'} />
        <div className="col-span-2 sm:col-span-1">
          <Stat label="Valor em estoque" value={money(value)} tone="gold" />
        </div>
      </div>
      <div className="mb-4 space-y-3 sm:flex sm:items-center sm:gap-3 sm:space-y-0">
        <div className="sm:w-80">
          <SearchInput value={q} onChange={setQ} placeholder="Buscar produto" />
        </div>
        <Chips
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'Todos', count: products.length },
            { value: 'low', label: 'Repor', count: low.length },
          ]}
        />
      </div>
      {!list.length ? (
        <div className="card">
          <Empty icon={Package} title="Nenhum produto" action={<Button variant="primary" icon={PackagePlus} onClick={() => openForm({ kind: 'product' })}>Cadastrar produto</Button>} />
        </div>
      ) : (
        <ul className="grid gap-2.5 md:grid-cols-2 2xl:grid-cols-3">
          {list.map((p) => {
            const isLow = p.qty <= p.minQty
            const pct = Math.min(100, (p.qty / Math.max(p.minQty * 3, 1)) * 100)
            return (
              <li key={p.id} className={cn('card p-3.5', isLow && 'border-danger/30')}>
                <div className="flex items-center gap-3">
                  <button onClick={() => openForm({ kind: 'product', id: p.id })} className="min-w-0 flex-1 text-left">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-medium">{p.name}</span>
                      {isLow && <Badge tone="red">Repor</Badge>}
                    </span>
                    <span className="block text-[12.5px] text-muted">
                      {p.category} · {money(p.cost)}/{p.unit}
                    </span>
                  </button>
                  <div className="flex items-center rounded-xl border border-line-2 bg-ink/50">
                    <button aria-label={`Diminuir ${p.name}`} onClick={() => adjust(p.id, -1)} className="grid h-10 w-10 place-items-center text-gold-400 active:scale-90">
                      <Minus size={17} />
                    </button>
                    <span className={cn('min-w-[46px] text-center font-display text-lg font-semibold tabular-nums', isLow && 'text-red-400')}>
                      {p.qty}
                      <span className="ml-0.5 text-[11px] font-normal text-subtle">{p.unit}</span>
                    </span>
                    <button aria-label={`Aumentar ${p.name}`} onClick={() => adjust(p.id, 1)} className="grid h-10 w-10 place-items-center text-gold-400 active:scale-90">
                      <Plus size={17} />
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
                    <div className={cn('h-full rounded-full transition-[width]', isLow ? 'bg-danger' : 'bg-gold-gradient')} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[11px] text-subtle">mín. {p.minQty}</span>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
