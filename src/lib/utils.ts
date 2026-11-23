import type { Order, OrderItem, OrderStatus } from './types'

export const cn = (...c: unknown[]) => c.filter(Boolean).join(' ')

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
export const money = (n: number) => brl.format(Number.isFinite(n) ? n : 0)
export const moneyShort = (n: number) =>
  n >= 1000 ? `R$ ${(n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil` : money(n)

const pad = (n: number) => String(n).padStart(2, '0')
export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const todayISO = () => toISO(new Date())
export const addDays = (iso: string, days: number) => {
  const d = parseISO(iso)
  d.setDate(d.getDate() + days)
  return toISO(d)
}
export const parseISO = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}
export const fmtDate = (iso?: string) => {
  if (!iso) return '—'
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}
export const fmtDayMonth = (iso: string) => {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}
export const weekday = (iso: string, style: 'long' | 'short' = 'short') =>
  parseISO(iso).toLocaleDateString('pt-BR', { weekday: style }).replace('.', '')
export const nowTime = () => {
  const d = new Date()
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export const itemsTotal = (items: OrderItem[]) => items.reduce((s, i) => s + i.price * i.qty, 0)
export const orderTotal = (o: { items: OrderItem[]; discount: number }) => Math.max(0, itemsTotal(o.items) - (o.discount || 0))
export const orderTitle = (o: Order) => o.items.map((i) => i.name).join(' + ') || 'Serviço'

export const STATUS: Record<OrderStatus, { label: string; tone: Tone }> = {
  agendado: { label: 'Agendado', tone: 'gold' },
  andamento: { label: 'Em andamento', tone: 'blue' },
  pronto: { label: 'Pronto', tone: 'green' },
  entregue: { label: 'Entregue', tone: 'violet' },
  cancelado: { label: 'Cancelado', tone: 'red' },
}
export const STATUS_FLOW: OrderStatus[] = ['agendado', 'andamento', 'pronto', 'entregue']

export type Tone = 'gold' | 'blue' | 'green' | 'violet' | 'red' | 'gray'

export const onlyDigits = (s: string) => s.replace(/\D/g, '')
export const fmtPhone = (s: string) => {
  const d = onlyDigits(s).slice(-11)
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return s
}
export const maskPhone = (s: string) => {
  const d = onlyDigits(s).slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ''
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}
export const maskPlate = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7)
// placas antigas (ABC1234) ganham hífen; Mercosul (ABC1D23) fica sem
export const fmtPlate = (s: string) => (/^[A-Z]{3}\d{4}$/.test(s) ? `${s.slice(0, 3)}-${s.slice(3)}` : s)

export const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()

export const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export const waLink = (phone: string, text: string) => {
  let d = onlyDigits(phone)
  if (d.length <= 11) d = '55' + d
  return `https://wa.me/${d}?text=${encodeURIComponent(text)}`
}

export const fillTemplate = (tpl: string, vars: Record<string, string>) =>
  tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`)

export const downloadFile = (name: string, content: string, type = 'text/csv;charset=utf-8') => {
  const blob = new Blob(['\ufeff' + content], { type })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

export const toCSV = (rows: (string | number)[][]) =>
  rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n')

/** Reduz uma imagem para caber no localStorage */
export const compressImage = (file: File, max = 640, quality = 0.7) =>
  new Promise<string>((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * s)
      c.height = Math.round(img.height * s)
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
      resolve(c.toDataURL('image/jpeg', quality))
      URL.revokeObjectURL(img.src)
    }
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
