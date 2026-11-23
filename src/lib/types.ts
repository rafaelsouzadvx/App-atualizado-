export type ID = string

export interface Client {
  id: ID
  name: string
  phone: string
  email?: string
  doc?: string
  birthday?: string
  notes?: string
  createdAt: string
}

export interface Vehicle {
  id: ID
  clientId: ID
  brand: string
  model: string
  year: string
  plate: string
  color: string
  type: 'carro' | 'suv' | 'picape' | 'moto'
}

export interface Service {
  id: ID
  name: string
  category: 'Lavagem' | 'Higienização' | 'Estética' | 'Proteção' | 'Outros'
  price: number
  duration: number // minutos
  active: boolean
}

export type OrderStatus = 'agendado' | 'andamento' | 'pronto' | 'entregue' | 'cancelado'
export type PayMethod = 'Pix' | 'Dinheiro' | 'Crédito' | 'Débito' | 'A prazo'

export interface OrderItem {
  serviceId?: ID
  name: string
  price: number
  qty: number
}

export interface Order {
  id: ID
  number: number
  clientId: ID
  vehicleId: ID
  items: OrderItem[]
  discount: number
  date: string // yyyy-mm-dd
  time: string // HH:mm
  status: OrderStatus
  payMethod?: PayMethod
  paid: boolean
  notes?: string
  createdAt: string
  finishedAt?: string
}

export type QuoteStatus = 'pendente' | 'aprovado' | 'recusado' | 'convertido'

export interface Quote {
  id: ID
  number: number
  clientId: ID
  vehicleId: ID
  items: OrderItem[]
  discount: number
  validUntil: string
  status: QuoteStatus
  notes?: string
  createdAt: string
  orderId?: ID
}

export interface Transaction {
  id: ID
  type: 'in' | 'out'
  category: string
  description: string
  amount: number
  date: string
  dueDate?: string
  method?: PayMethod
  status: 'pago' | 'pendente'
  orderId?: ID
  clientId?: ID
}

export interface Product {
  id: ID
  name: string
  category: string
  unit: string
  qty: number
  minQty: number
  cost: number
}

export interface Damage {
  id: ID
  x: number
  y: number
  kind: 'Risco' | 'Amassado' | 'Trinca' | 'Pintura' | 'Outro'
  note?: string
}

export interface Inspection {
  id: ID
  clientId: ID
  vehicleId: ID
  orderId?: ID
  date: string
  km: string
  fuel: number // 0-4
  checklist: Record<string, boolean>
  damages: Damage[]
  photos: string[]
  notes?: string
}

export interface Settings {
  businessName: string
  ownerName: string
  phone: string
  address: string
  monthlyGoal: number
  openTime: string
  closeTime: string
  templates: { id: ID; title: string; text: string }[]
}

export interface DB {
  clients: Client[]
  vehicles: Vehicle[]
  services: Service[]
  orders: Order[]
  quotes: Quote[]
  transactions: Transaction[]
  products: Product[]
  inspections: Inspection[]
  settings: Settings
}
