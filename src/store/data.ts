import { useMemo } from 'react'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { DB, ID, Order, OrderStatus, PayMethod, Quote, Settings, Transaction } from '../lib/types'
import { createSeed, DEFAULT_TEMPLATES } from '../lib/seed'
import { addDays, orderTotal, parseISO, todayISO, uid } from '../lib/utils'

type Collection = Exclude<keyof DB, 'settings'>
type Item<K extends Collection> = DB[K][number]

interface Actions {
  upsert: <K extends Collection>(key: K, item: Item<K>) => void
  remove: <K extends Collection>(key: K, id: ID) => void
  nextOrderNumber: () => number
  nextQuoteNumber: () => number
  setOrderStatus: (id: ID, status: OrderStatus) => void
  deliverOrder: (id: ID, method: PayMethod) => void
  receive: (txId: ID, method?: PayMethod) => void
  convertQuote: (quoteId: ID, date: string, time: string) => Order | undefined
  adjustStock: (productId: ID, delta: number) => void
  updateSettings: (s: Partial<Settings>) => void
  resetDemo: () => void
  clearAll: () => void
}

export type Store = DB & Actions & { anchor?: string }

const safeStorage = createJSONStorage(() => {
  try {
    const k = '__t'
    localStorage.setItem(k, k)
    localStorage.removeItem(k)
    return localStorage
  } catch {
    const mem = new Map<string, string>()
    return {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
    }
  }
})

export const useDB = create<Store>()(
  persist(
    (set, get) => ({
      ...createSeed(),
      anchor: todayISO(),

      upsert: (key, item) =>
        set((s) => {
          const list = s[key] as { id: ID }[]
          const exists = list.some((x) => x.id === item.id)
          return { [key]: exists ? list.map((x) => (x.id === item.id ? item : x)) : [item, ...list] } as Partial<Store>
        }),

      remove: (key, id) =>
        set((s) => {
          const patch: Partial<Store> = { [key]: (s[key] as { id: ID }[]).filter((x) => x.id !== id) } as Partial<Store>
          if (key === 'clients') patch.vehicles = s.vehicles.filter((v) => v.clientId !== id)
          return patch
        }),

      nextOrderNumber: () => Math.max(1000, ...get().orders.map((o) => o.number)) + 1,
      nextQuoteNumber: () => Math.max(300, ...get().quotes.map((o) => o.number)) + 1,

      setOrderStatus: (id, status) =>
        set((s) => ({
          orders: s.orders.map((o) => (o.id === id ? { ...o, status, finishedAt: status === 'pronto' ? todayISO() : o.finishedAt } : o)),
        })),

      deliverOrder: (id, method) =>
        set((s) => {
          const o = s.orders.find((x) => x.id === id)
          if (!o) return {}
          const paid = method !== 'A prazo'
          const tx: Transaction = {
            id: uid(),
            type: 'in',
            category: 'Serviços',
            description: `OS #${o.number} — ${o.items.map((i) => i.name).join(' + ')}`,
            amount: orderTotal(o),
            date: todayISO(),
            method,
            status: paid ? 'pago' : 'pendente',
            dueDate: paid ? undefined : addDays(todayISO(), 7),
            orderId: o.id,
            clientId: o.clientId,
          }
          return {
            orders: s.orders.map((x) => (x.id === id ? { ...x, status: 'entregue', paid, payMethod: method, finishedAt: todayISO() } : x)),
            transactions: [tx, ...s.transactions.filter((t) => t.orderId !== id)],
          }
        }),

      receive: (txId, method) =>
        set((s) => {
          const tx = s.transactions.find((t) => t.id === txId)
          return {
            transactions: s.transactions.map((t) =>
              t.id === txId ? { ...t, status: 'pago', date: todayISO(), method: t.type === 'in' ? method ?? 'Pix' : t.method ?? method } : t,
            ),
            orders: tx?.orderId ? s.orders.map((o) => (o.id === tx.orderId ? { ...o, paid: true } : o)) : s.orders,
          }
        }),

      convertQuote: (quoteId, date, time) => {
        const q = get().quotes.find((x) => x.id === quoteId)
        if (!q) return
        const order: Order = {
          id: uid(),
          number: get().nextOrderNumber(),
          clientId: q.clientId,
          vehicleId: q.vehicleId,
          items: q.items,
          discount: q.discount,
          date,
          time,
          status: 'agendado',
          paid: false,
          notes: q.notes,
          createdAt: new Date().toISOString(),
        }
        set((s) => ({
          orders: [order, ...s.orders],
          quotes: s.quotes.map((x): Quote => (x.id === quoteId ? { ...x, status: 'convertido', orderId: order.id } : x)),
        }))
        return order
      },

      adjustStock: (productId, delta) =>
        set((s) => ({ products: s.products.map((p) => (p.id === productId ? { ...p, qty: Math.max(0, p.qty + delta) } : p)) })),

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      resetDemo: () => set(() => ({ ...createSeed(), anchor: todayISO() })),

      clearAll: () =>
        set((s) => ({ clients: [], vehicles: [], orders: [], quotes: [], transactions: [], products: [], inspections: [], settings: s.settings, anchor: undefined })),
    }),
    {
      name: 'rafael-estetica-v1',
      storage: safeStorage,
      version: 1,
      partialize: (s) => ({
        clients: s.clients,
        vehicles: s.vehicles,
        services: s.services,
        orders: s.orders,
        quotes: s.quotes,
        transactions: s.transactions,
        products: s.products,
        inspections: s.inspections,
        settings: s.settings,
        anchor: s.anchor,
      }),
      // Mantém os dados de demonstração "vivos": desloca as datas para o dia de hoje
      merge: (persisted, current) => {
        const p = persisted as Partial<Store>
        const merged = { ...current, ...p } as Store
        // navegadores com dados salvos antes de um novo modelo padrão existir não o recebem automaticamente
        if (p?.settings?.templates) {
          const known = new Set(p.settings.templates.map((t) => t.id))
          const missing = DEFAULT_TEMPLATES.filter((t) => !known.has(t.id))
          if (missing.length) merged.settings = { ...merged.settings, templates: [...p.settings.templates, ...missing] }
        }
        // quem já usava o app com o nome padrão antigo passa a ver o nome novo (nomes personalizados ficam como estão)
        if (merged.settings.businessName === 'Rafael Lava Jato & Estética Automotiva') {
          merged.settings = { ...merged.settings, businessName: 'JAT Wash Lava Jato & Estética Automotiva' }
        }
        if (!p?.anchor) return merged
        const diff = Math.round((parseISO(todayISO()).getTime() - parseISO(p.anchor).getTime()) / 86400000)
        if (!diff) return merged
        const sh = (d?: string) => (d ? addDays(d.slice(0, 10), diff) : d)
        return {
          ...merged,
          anchor: todayISO(),
          orders: merged.orders.map((o) => ({ ...o, date: sh(o.date)!, finishedAt: sh(o.finishedAt) })),
          transactions: merged.transactions.map((t) => ({ ...t, date: sh(t.date)!, dueDate: sh(t.dueDate) })),
          quotes: merged.quotes.map((q) => ({ ...q, validUntil: sh(q.validUntil)! })),
          inspections: merged.inspections.map((i) => ({ ...i, date: sh(i.date)! })),
        }
      },
    },
  ),
)

// seletores auxiliares
export const useClientMap = () => {
  const clients = useDB((s) => s.clients)
  return useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients])
}
export const useVehicleMap = () => {
  const vehicles = useDB((s) => s.vehicles)
  return useMemo(() => new Map(vehicles.map((v) => [v.id, v])), [vehicles])
}
