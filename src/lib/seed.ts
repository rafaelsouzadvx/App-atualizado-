import type { Client, DB, Order, OrderItem, OrderStatus, PayMethod, Product, Service, Transaction, Vehicle, Inspection } from './types'
import { addDays, orderTotal, todayISO } from './utils'

// gerador pseudo-aleatório determinístico → os dados de demo ficam sempre iguais
function rng(seed = 42) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

export const DEFAULT_TEMPLATES = [
  { id: 't1', title: 'Lembrete de agendamento', text: 'Olá, {nome}! 👋 Passando para lembrar do seu agendamento de *{servico}* no dia {data} às {hora} para o {veiculo}. Qualquer dúvida é só chamar! — {empresa}' },
  { id: 't2', title: 'Veículo pronto', text: 'Olá, {nome}! ✨ Seu {veiculo} está pronto e brilhando! Pode vir buscar quando quiser. Total: {valor}. — {empresa}' },
  { id: 't3', title: 'Orçamento', text: 'Olá, {nome}! Segue o orçamento para o seu {veiculo}:\n\n{itens}\n\n*Total: {valor}*\n\nPosso agendar para você? — {empresa}' },
  { id: 't4', title: 'Cobrança amigável', text: 'Olá, {nome}! Tudo bem? Lembrando que o pagamento de {valor} referente ao serviço no {veiculo} vence em {data}. Aceitamos Pix! Obrigado 🙏 — {empresa}' },
  { id: 't5', title: 'Pós-venda', text: 'Olá, {nome}! Obrigado pela confiança 💛 Como ficou o seu {veiculo}? Sua avaliação ajuda muito a gente! — {empresa}' },
  {
    id: 't6',
    title: 'Vistoria de entrada',
    text: 'Olá, {nome}! Antes de começarmos o serviço no seu {veiculo}, fizemos a vistoria de entrada 📋\n\n🗓️ Data: {data}\n🛞 KM: {km}\n⛽ Combustível: {combustivel}\n✅ Checklist: {checklist}\n\n*Avarias encontradas:*\n{avarias}\n\nSe notar algo diferente do que está registrado, nos avise agora. Assim que finalizarmos, te chamamos! — {empresa}',
  },
]

export const CHECKLIST_ITEMS = [
  'Documentos no veículo',
  'Objetos de valor retirados',
  'Estepe e ferramentas',
  'Tapetes',
  'Som / multimídia funcionando',
  'Faróis e lanternas ok',
  'Vidros sem trincas',
  'Rodas sem avarias',
]

export function createSeed(): DB {
  const r = rng(7)
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)]
  const today = todayISO()
  const iso = new Date().toISOString()

  const services: Service[] = [
    { id: 's1', name: 'Lavagem simples', category: 'Lavagem', price: 60, duration: 40, active: true },
    { id: 's2', name: 'Lavagem completa', category: 'Lavagem', price: 120, duration: 90, active: true },
    { id: 's3', name: 'Lavagem de motor', category: 'Lavagem', price: 80, duration: 40, active: true },
    { id: 's4', name: 'Higienização interna', category: 'Higienização', price: 150, duration: 180, active: true },
    { id: 's5', name: 'Higienização de bancos de couro', category: 'Higienização', price: 220, duration: 150, active: true },
    { id: 's6', name: 'Polimento técnico', category: 'Estética', price: 350, duration: 240, active: true },
    { id: 's7', name: 'Polimento + Cristalização', category: 'Estética', price: 450, duration: 300, active: true },
    { id: 's8', name: 'Revitalização de faróis', category: 'Estética', price: 120, duration: 60, active: true },
    { id: 's9', name: 'Vitrificação de pintura', category: 'Proteção', price: 1200, duration: 480, active: true },
    { id: 's10', name: 'Enceramento', category: 'Proteção', price: 90, duration: 60, active: true },
    { id: 's11', name: 'Oxi-sanitização', category: 'Higienização', price: 100, duration: 45, active: true },
    { id: 's12', name: 'Leva e traz', category: 'Outros', price: 30, duration: 0, active: true },
  ]
  const S = Object.fromEntries(services.map((s) => [s.id, s]))

  const names = [
    'João Silva', 'Maria Oliveira', 'Carlos Santos', 'Fernanda Lima', 'Ricardo Alves', 'Ana Costa', 'Mariana Costa',
    'Ricardo Lima', 'Juliana Ferreira', 'Pedro Henrique', 'Lucas Martins', 'Beatriz Rocha', 'Gabriel Souza', 'Camila Ribeiro',
    'Rafael Pereira', 'Larissa Gomes', 'Thiago Carvalho', 'Patrícia Mendes', 'Bruno Araújo', 'Aline Barbosa', 'Diego Cardoso',
    'Vanessa Teixeira', 'Felipe Moreira', 'Natália Pinto', 'Rodrigo Nunes', 'Débora Castro', 'Marcelo Dias', 'Letícia Freitas',
    'André Correia', 'Tatiane Lopes', 'Gustavo Ramos', 'Priscila Vieira', 'Eduardo Farias', 'Renata Moura', 'Leandro Azevedo', 'Sabrina Duarte',
  ]
  const cars: [string, string, Vehicle['type']][] = [
    ['Honda', 'Civic', 'carro'], ['Toyota', 'Corolla', 'carro'], ['Volkswagen', 'Jetta', 'carro'], ['Fiat', 'Argo', 'carro'],
    ['Jeep', 'Compass', 'suv'], ['BMW', '320i', 'carro'], ['Hyundai', 'HB20', 'carro'], ['Ford', 'Ranger', 'picape'],
    ['Toyota', 'Hilux', 'picape'], ['Chevrolet', 'Onix', 'carro'], ['Volkswagen', 'T-Cross', 'suv'], ['Fiat', 'Toro', 'picape'],
    ['Hyundai', 'Creta', 'suv'], ['Renault', 'Kwid', 'carro'], ['Nissan', 'Kicks', 'suv'], ['Chevrolet', 'Tracker', 'suv'],
    ['Volkswagen', 'Polo', 'carro'], ['Honda', 'HR-V', 'suv'], ['Fiat', 'Strada', 'picape'], ['Toyota', 'Yaris', 'carro'],
  ]
  const fixedPlates = ['ABC1D23', 'DEF4G56', 'GHI7J89', 'KLM0N12', 'PQR3S45', 'TUV6W78', 'HBX2A19', 'RNG5B21', 'JFR8C22']
  const fixedCars = [0, 1, 2, 3, 4, 5, 6, 7, 1]
  const colors = ['Preto', 'Branco', 'Prata', 'Cinza', 'Vermelho', 'Azul', 'Grafite']
  const L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const plate = () => `${pick([...L])}${pick([...L])}${pick([...L])}${Math.floor(r() * 10)}${pick([...L])}${Math.floor(r() * 10)}${Math.floor(r() * 10)}`

  const clients: Client[] = []
  const vehicles: Vehicle[] = []
  names.forEach((name, i) => {
    const id = `c${i + 1}`
    const ddd = pick(['17', '17', '17', '16', '11'])
    clients.push({
      id,
      name,
      phone: `(${ddd}) 9${String(8000 + Math.floor(r() * 1999))}-${String(1000 + Math.floor(r() * 8999))}`,
      email: `${name.split(' ')[0].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}@email.com`,
      createdAt: addDays(today, -Math.floor(20 + r() * 300)),
    })
    const ci = i < fixedCars.length ? fixedCars[i] : (i * 7 + 3) % cars.length
    const [brand, model, type] = cars[ci]
    vehicles.push({
      id: `v${i + 1}`,
      clientId: id,
      brand,
      model,
      type,
      year: String(2016 + Math.floor(r() * 9)),
      plate: i < fixedPlates.length ? fixedPlates[i] : plate(),
      color: pick(colors),
    })
    if (i % 7 === 3) {
      const [b2, m2, t2] = pick(cars)
      vehicles.push({ id: `v${i + 1}b`, clientId: id, brand: b2, model: m2, type: t2, year: String(2014 + Math.floor(r() * 10)), plate: plate(), color: pick(colors) })
    }
  })
  // ajustes para bater com o layout de referência
  vehicles[0].year = '2020'
  vehicles.find((v) => v.clientId === 'c7')!.year = '2019'

  const item = (sid: string): OrderItem => ({ serviceId: sid, name: S[sid].name, price: S[sid].price, qty: 1 })
  const orders: Order[] = []
  const transactions: Transaction[] = []
  let num = 1001
  const methods: PayMethod[] = ['Pix', 'Pix', 'Pix', 'Crédito', 'Débito', 'Dinheiro']
  const vehicleOf = (cid: string) => vehicles.find((v) => v.clientId === cid)!

  const pushOrder = (o: Omit<Order, 'id' | 'number' | 'createdAt' | 'discount'> & { discount?: number }) => {
    const order: Order = { discount: 0, ...o, id: `o${num}`, number: num++, createdAt: iso }
    orders.push(order)
    if (order.status === 'entregue') {
      transactions.push({
        id: `tx${order.id}`,
        type: 'in',
        category: 'Serviços',
        description: `OS #${order.number} — ${order.items.map((i) => i.name).join(' + ')}`,
        amount: orderTotal(order),
        date: order.date,
        method: order.payMethod,
        status: order.paid ? 'pago' : 'pendente',
        dueDate: order.paid ? undefined : addDays(order.date, 5),
        orderId: order.id,
        clientId: order.clientId,
      })
    }
    return order
  }

  // histórico: últimos 40 dias
  const weights = ['s1', 's2', 's2', 's2', 's4', 's4', 's1', 's10', 's7', 's6', 's3', 's11', 's8', 's5']
  const dailyTargets: Record<number, number> = { 6: 980, 5: 1240, 4: 1560, 3: 1320, 2: 1870, 1: 1430 }
  for (let d = 40; d >= 1; d--) {
    const date = addDays(today, -d)
    const dow = new Date(date + 'T12:00').getDay()
    if (dow === 0) continue
    const target = dailyTargets[d] ?? 700 + Math.floor(r() * 1100)
    let sum = 0
    let h = 8
    let guard = 0
    while (sum < target - 50 && guard++ < 14) {
      const cid = `c${1 + Math.floor(r() * names.length)}`
      let sid = pick(weights)
      let price = S[sid].price
      if (sum + price > target) {
        price = target - sum
        sid = 's2'
      }
      const it = { ...item(sid), price }
      sum += price
      pushOrder({
        clientId: cid,
        vehicleId: vehicleOf(cid).id,
        items: [it],
        date,
        time: `${String(h).padStart(2, '0')}:${pick(['00', '30'])}`,
        status: 'entregue',
        paid: true,
        payMethod: pick(methods),
        finishedAt: date,
      })
      h = Math.min(18, h + 1)
    }
  }

  // hoje (igual ao layout)
  const todayPlan: [string, string, string[], OrderStatus][] = [
    ['c1', '08:00', ['s2'], 'entregue'],
    ['c2', '09:30', ['s4'], 'pronto'],
    ['c3', '11:00', ['s7'], 'andamento'],
    ['c4', '14:00', ['s1'], 'agendado'],
    ['c5', '16:30', ['s4'], 'agendado'],
    ['c6', '18:00', ['s7'], 'agendado'],
  ]
  // atendimentos avulsos já entregues hoje
  ;[
    ['c7', '07:30', ['s4'], 'entregue'],
    ['c8', '08:15', ['s7'], 'entregue'],
    ['c9', '09:00', ['s2'], 'entregue'],
    ['c10', '10:10', ['s2', 's3', 's10'], 'entregue'],
    ['c11', '12:00', ['s8', 's10', 's11'], 'entregue'],
    ['c12', '12:40', ['s1'], 'cancelado'],
  ].forEach(([cid, time, sids, status]) =>
    pushOrder({
      clientId: cid as string,
      vehicleId: vehicleOf(cid as string).id,
      items: (sids as string[]).map(item),
      date: today,
      time: time as string,
      status: status as OrderStatus,
      paid: status === 'entregue',
      payMethod: status === 'entregue' ? 'Pix' : undefined,
      finishedAt: status === 'entregue' ? today : undefined,
    }),
  )
  todayPlan.forEach(([cid, time, sids, status]) =>
    pushOrder({ clientId: cid, vehicleId: vehicleOf(cid).id, items: sids.map(item), date: today, time, status, paid: status === 'entregue', payMethod: status === 'entregue' ? 'Pix' : undefined, finishedAt: status === 'entregue' ? today : undefined }),
  )
  // próximos dias
  for (let d = 1; d <= 6; d++) {
    const n = 2 + Math.floor(r() * 4)
    for (let k = 0; k < n; k++) {
      const cid = `c${1 + Math.floor(r() * names.length)}`
      pushOrder({ clientId: cid, vehicleId: vehicleOf(cid).id, items: [item(pick(weights))], date: addDays(today, d), time: `${String(8 + k * 2).padStart(2, '0')}:00`, status: 'agendado', paid: false })
    }
  }

  // contas a receber (a prazo)
  ;[
    ['c3', 200, 2], ['c4', 150, 3], ['c5', 300, 5], ['c6', 180, 7], ['c14', 450, -2],
  ].forEach(([cid, amount, due], i) => {
    const date = addDays(today, -3 - i)
    transactions.push({
      id: `rec${i}`,
      type: 'in',
      category: 'Serviços',
      description: `Serviço a prazo — ${names[Number(String(cid).slice(1)) - 1]}`,
      amount: amount as number,
      date,
      dueDate: addDays(today, due as number),
      method: 'A prazo',
      status: 'pendente',
      clientId: cid as string,
    })
  })

  // despesas
  const monthStart = today.slice(0, 8) + '01'
  const expenses: [string, string, number, number][] = [
    ['Aluguel do galpão', 'Aluguel', 2800, 0],
    ['Conta de água', 'Contas', 640, 2],
    ['Energia elétrica', 'Contas', 520, 3],
    ['Produtos Vonixx', 'Produtos', 1180, 5],
    ['Salário auxiliar', 'Folha', 1900, 4],
    ['Internet', 'Contas', 120, 6],
    ['Toalhas de microfibra', 'Produtos', 260, 9],
  ]
  expenses.forEach(([description, category, amount, off], i) => {
    const date = addDays(monthStart, off)
    transactions.push({ id: `exp${i}`, type: 'out', category, description, amount, date: date > today ? today : date, method: 'Pix', status: 'pago' })
  })
  transactions.push({ id: 'exp-next', type: 'out', category: 'Produtos', description: 'Boleto fornecedor (cera + shampoo)', amount: 740, date: today, dueDate: addDays(today, 4), status: 'pendente' })

  const products: Product[] = [
    { id: 'p1', name: 'Shampoo automotivo V-Floc', category: 'Lavagem', unit: 'L', qty: 18, minQty: 5, cost: 38 },
    { id: 'p2', name: 'APC multiuso', category: 'Limpeza', unit: 'L', qty: 3, minQty: 5, cost: 42 },
    { id: 'p3', name: 'Cera de carnaúba', category: 'Proteção', unit: 'un', qty: 7, minQty: 3, cost: 89 },
    { id: 'p4', name: 'Composto polidor corte', category: 'Polimento', unit: 'un', qty: 2, minQty: 2, cost: 120 },
    { id: 'p5', name: 'Boina de lã', category: 'Polimento', unit: 'un', qty: 9, minQty: 4, cost: 45 },
    { id: 'p6', name: 'Toalha microfibra 40x40', category: 'Acessórios', unit: 'un', qty: 42, minQty: 20, cost: 12 },
    { id: 'p7', name: 'Pretinho para pneus', category: 'Acabamento', unit: 'L', qty: 6, minQty: 3, cost: 35 },
    { id: 'p8', name: 'Limpa vidros', category: 'Limpeza', unit: 'L', qty: 4, minQty: 3, cost: 28 },
    { id: 'p9', name: 'Hidratante de couro', category: 'Higienização', unit: 'un', qty: 1, minQty: 2, cost: 76 },
    { id: 'p10', name: 'Vitrificador 9H', category: 'Proteção', unit: 'un', qty: 3, minQty: 1, cost: 390 },
  ]

  const inspections: Inspection[] = [
    {
      id: 'i1',
      clientId: 'c3',
      vehicleId: vehicleOf('c3').id,
      orderId: orders.find((o) => o.clientId === 'c3' && o.date === today && o.time === '11:00')?.id,
      date: today,
      km: '48.230',
      fuel: 2,
      checklist: Object.fromEntries(CHECKLIST_ITEMS.map((c, i) => [c, i !== 2])),
      damages: [
        { id: 'd1', x: 0.27, y: 0.2, kind: 'Risco', note: 'Risco leve no para-choque' },
        { id: 'd2', x: 0.78, y: 0.78, kind: 'Amassado', note: 'Pequeno amassado porta traseira' },
      ],
      photos: [],
      notes: 'Cliente pediu atenção especial ao capô.',
    },
  ]

  return {
    clients,
    vehicles,
    services,
    orders,
    quotes: [
      { id: 'q1', number: 301, clientId: 'c13', vehicleId: vehicleOf('c13').id, items: [item('s9'), item('s8')], discount: 120, validUntil: addDays(today, 7), status: 'pendente', createdAt: iso, notes: 'Cliente quer fazer antes da viagem.' },
      { id: 'q2', number: 302, clientId: 'c15', vehicleId: vehicleOf('c15').id, items: [item('s7'), item('s4')], discount: 0, validUntil: addDays(today, 5), status: 'aprovado', createdAt: iso },
      { id: 'q3', number: 303, clientId: 'c18', vehicleId: vehicleOf('c18').id, items: [item('s5')], discount: 20, validUntil: addDays(today, -1), status: 'recusado', createdAt: iso },
    ],
    transactions,
    products,
    inspections,
    settings: {
      businessName: 'JAT Wash Lava Rápido',
      ownerName: 'Rafael',
      phone: '(17) 99999-0000',
      address: 'Av. Principal, 1000 — Centro',
      monthlyGoal: 40000,
      openTime: '07:30',
      closeTime: '18:30',
      templates: DEFAULT_TEMPLATES,
    },
  }
}

