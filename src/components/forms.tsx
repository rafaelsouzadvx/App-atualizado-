import { useMemo, useState, type ReactNode } from 'react'
import { Minus, Plus, Trash2, UserPlus, Car, Check } from 'lucide-react'
import type { Client, Order, OrderItem, OrderStatus, PayMethod, Product, Quote, Service, Transaction, Vehicle } from '../lib/types'
import { addDays, cn, fmtPlate, itemsTotal, maskPhone, maskPlate, money, nowTime, onlyDigits, todayISO, uid, STATUS } from '../lib/utils'
import { useDB } from '../store/data'
import { openForm, toast, useUI, confirmDialog } from '../store/ui'
import { Button, Field, Input, Select, Sheet, Textarea } from './ui'
import { InspectionForm } from './InspectionForm'

/* ---------- helpers ---------- */
function Grid({ children }: { children: ReactNode }) {
  return <div className="grid gap-3.5 sm:grid-cols-2">{children}</div>
}
function Toggle<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string; cls?: string }[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          type="button"
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'h-10 rounded-xl border px-3.5 text-[13.5px] font-medium transition',
            value === o.value ? o.cls ?? 'border-gold-500 bg-gold-500/15 text-gold-200' : 'border-line-2 bg-ink/40 text-muted hover:text-fg',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
const num = (v: string) => {
  const n = parseFloat(v.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}
function DeleteBtn({ onDelete, label }: { onDelete: () => void; label: string }) {
  return (
    <Button
      variant="danger"
      icon={Trash2}
      className="!flex-none"
      aria-label={`Excluir ${label}`}
      onClick={async () => {
        if (await confirmDialog({ title: `Excluir ${label}?`, message: 'Essa ação não pode ser desfeita.', confirmLabel: 'Excluir', danger: true })) onDelete()
      }}
    />
  )
}

/* ---------- Cliente ---------- */
function ClientForm({ id, preset }: { id?: string; preset?: Record<string, unknown> }) {
  const { clients, upsert, remove } = useDB()
  const close = useUI((s) => s.closeForm)
  const existing = clients.find((c) => c.id === id)
  const [f, setF] = useState<Client>(existing ?? { id: uid(), name: (preset?.name as string) ?? '', phone: '', email: '', doc: '', notes: '', createdAt: todayISO() })
  const [car, setCar] = useState({ brand: '', model: '', plate: '', color: 'Preto' })
  const [err, setErr] = useState<Record<string, string>>({})
  const set = (k: keyof Client, v: string) => setF((s) => ({ ...s, [k]: v }))

  const save = () => {
    const e: Record<string, string> = {}
    if (f.name.trim().length < 3) e.name = 'Informe o nome completo'
    if (onlyDigits(f.phone).length < 10) e.phone = 'WhatsApp inválido'
    setErr(e)
    if (Object.keys(e).length) return
    upsert('clients', { ...f, name: f.name.trim() })
    if (!existing && car.model.trim()) {
      upsert('vehicles', { id: uid(), clientId: f.id, brand: car.brand.trim(), model: car.model.trim(), plate: maskPlate(car.plate), color: car.color, year: '', type: 'carro' })
    }
    toast(existing ? 'Cliente atualizado' : 'Cliente cadastrado')
    const cb = preset?.onSaved as ((id: string) => void) | undefined
    close()
    cb?.(f.id)
  }

  return (
    <Sheet
      open
      onClose={close}
      title={existing ? 'Editar cliente' : 'Novo cliente'}
      footer={
        <>
          {existing && (
            <DeleteBtn
              label="cliente"
              onDelete={() => {
                remove('clients', existing.id)
                toast('Cliente excluído')
                close()
                useUI.getState().openDetail(null)
              }}
            />
          )}
          <Button onClick={close}>Cancelar</Button>
          <Button variant="primary" onClick={save}>
            Salvar
          </Button>
        </>
      }
    >
      <div className="space-y-3.5">
        <Field label="Nome completo *" hint={err.name && <span className="text-red-400">{err.name}</span>}>
          <Input autoFocus value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Ex.: João Silva" />
        </Field>
        <Grid>
          <Field label="WhatsApp *" hint={err.phone && <span className="text-red-400">{err.phone}</span>}>
            <Input inputMode="tel" value={f.phone} onChange={(e) => set('phone', maskPhone(e.target.value))} placeholder="(17) 99999-9999" />
          </Field>
          <Field label="E-mail">
            <Input type="email" inputMode="email" value={f.email} onChange={(e) => set('email', e.target.value)} placeholder="opcional" />
          </Field>
          <Field label="CPF / CNPJ">
            <Input inputMode="numeric" value={f.doc} onChange={(e) => set('doc', e.target.value)} placeholder="opcional" />
          </Field>
          <Field label="Aniversário">
            <Input type="date" value={f.birthday ?? ''} onChange={(e) => set('birthday', e.target.value)} />
          </Field>
        </Grid>
        <Field label="Observações">
          <Textarea value={f.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Preferências, alergias a produtos, etc." />
        </Field>
        {!existing && (
          <div className="rounded-2xl border border-dashed border-gold-500/30 bg-gold-500/[0.03] p-3.5">
            <p className="mb-3 flex items-center gap-2 text-sm font-medium text-gold-200">
              <Car size={17} /> Já cadastrar o veículo <span className="text-xs font-normal text-muted">(opcional)</span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Input value={car.brand} onChange={(e) => setCar({ ...car, brand: e.target.value })} placeholder="Marca" />
              <Input value={car.model} onChange={(e) => setCar({ ...car, model: e.target.value })} placeholder="Modelo" />
              <Input value={car.plate} onChange={(e) => setCar({ ...car, plate: maskPlate(e.target.value) })} placeholder="Placa" className="font-mono uppercase" />
              <Select value={car.color} onChange={(e) => setCar({ ...car, color: e.target.value })}>
                {COLORS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </div>
          </div>
        )}
      </div>
    </Sheet>
  )
}

const COLORS = ['Preto', 'Branco', 'Prata', 'Cinza', 'Vermelho', 'Azul', 'Grafite']

/* ---------- Veículo ---------- */
function VehicleForm({ id, preset }: { id?: string; preset?: Record<string, unknown> }) {
  const { vehicles, clients, upsert, remove } = useDB()
  const close = useUI((s) => s.closeForm)
  const existing = vehicles.find((v) => v.id === id)
  const [f, setF] = useState<Vehicle>(
    existing ?? { id: uid(), clientId: (preset?.clientId as string) ?? '', brand: '', model: '', year: '', plate: '', color: 'Preto', type: 'carro' },
  )
  const [err, setErr] = useState<Record<string, string>>({})
  const set = <K extends keyof Vehicle>(k: K, v: Vehicle[K]) => setF((s) => ({ ...s, [k]: v }))
  const sorted = useMemo(() => [...clients].sort((a, b) => a.name.localeCompare(b.name)), [clients])

  const save = () => {
    const e: Record<string, string> = {}
    if (!f.clientId) e.clientId = 'Selecione o cliente'
    if (!f.model.trim()) e.model = 'Obrigatório'
    if (f.plate.length < 7) e.plate = 'Placa incompleta'
    else if (vehicles.some((v) => v.plate === f.plate && v.id !== f.id)) e.plate = 'Placa já cadastrada'
    setErr(e)
    if (Object.keys(e).length) return
    upsert('vehicles', f)
    toast(existing ? 'Veículo atualizado' : 'Veículo cadastrado')
    const cb = preset?.onSaved as ((id: string) => void) | undefined
    close()
    cb?.(f.id)
  }

  return (
    <Sheet
      open
      onClose={close}
      title={existing ? 'Editar veículo' : 'Novo veículo'}
      footer={
        <>
          {existing && (
            <DeleteBtn
              label="veículo"
              onDelete={() => {
                remove('vehicles', existing.id)
                toast('Veículo excluído')
                close()
              }}
            />
          )}
          <Button onClick={close}>Cancelar</Button>
          <Button variant="primary" onClick={save}>
            Salvar
          </Button>
        </>
      }
    >
      <div className="space-y-3.5">
        <Field
          label="Proprietário *"
          hint={
            err.clientId ? (
              <span className="text-red-400">{err.clientId}</span>
            ) : (
              <button type="button" className="text-gold-400" onClick={() => openForm({ kind: 'client', preset: { onSaved: (cid: string) => set('clientId', cid) } })}>
                + Novo cliente
              </button>
            )
          }
        >
          <Select value={f.clientId} onChange={(e) => set('clientId', e.target.value)}>
            <option value="">Selecione…</option>
            {sorted.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Tipo">
          <Toggle
            value={f.type}
            onChange={(v) => set('type', v)}
            options={[
              { value: 'carro', label: 'Carro' },
              { value: 'suv', label: 'SUV' },
              { value: 'picape', label: 'Picape' },
              { value: 'moto', label: 'Moto' },
            ]}
          />
        </Field>
        <Grid>
          <Field label="Marca">
            <Input value={f.brand} onChange={(e) => set('brand', e.target.value)} placeholder="Ex.: Honda" />
          </Field>
          <Field label="Modelo *" hint={err.model && <span className="text-red-400">{err.model}</span>}>
            <Input value={f.model} onChange={(e) => set('model', e.target.value)} placeholder="Ex.: Civic" />
          </Field>
          <Field label="Placa *" hint={err.plate && <span className="text-red-400">{err.plate}</span>}>
            <Input value={f.plate} onChange={(e) => set('plate', maskPlate(e.target.value))} placeholder="ABC1D23" className="font-mono uppercase tracking-widest" />
          </Field>
          <Field label="Ano">
            <Input inputMode="numeric" maxLength={4} value={f.year} onChange={(e) => set('year', onlyDigits(e.target.value))} placeholder="2022" />
          </Field>
        </Grid>
        <Field label="Cor">
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => set('color', c)}
                className={cn('flex h-10 items-center gap-2 rounded-xl border px-3 text-[13px]', f.color === c ? 'border-gold-500 bg-gold-500/10' : 'border-line-2 text-muted')}
              >
                <span className="h-4 w-4 rounded-full ring-1 ring-white/20" style={{ background: COLOR_HEX[c] }} />
                {c}
              </button>
            ))}
          </div>
        </Field>
      </div>
    </Sheet>
  )
}
const COLOR_HEX: Record<string, string> = { Preto: '#111', Branco: '#f3f3f3', Prata: '#b8bcc2', Cinza: '#6b7078', Vermelho: '#c0261e', Azul: '#1e4fa3', Grafite: '#3b3f46' }

/* ---------- Seletor de serviços (OS / orçamento) ---------- */
function ItemsPicker({ items, setItems }: { items: OrderItem[]; setItems: (i: OrderItem[]) => void }) {
  const all = useDB((s) => s.services)
  const services = useMemo(() => all.filter((x) => x.active), [all])
  const [custom, setCustom] = useState({ name: '', price: '' })
  const toggle = (s: Service) => {
    const has = items.find((i) => i.serviceId === s.id)
    setItems(has ? items.filter((i) => i.serviceId !== s.id) : [...items, { serviceId: s.id, name: s.name, price: s.price, qty: 1 }])
  }
  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        {services.map((s) => {
          const on = items.some((i) => i.serviceId === s.id)
          return (
            <button
              type="button"
              key={s.id}
              onClick={() => toggle(s)}
              className={cn(
                'flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition',
                on ? 'border-gold-500 bg-gold-500/10' : 'border-line-2 bg-ink/40 hover:border-line-2 hover:bg-white/[0.02]',
              )}
            >
              <span className={cn('grid h-5 w-5 shrink-0 place-items-center rounded-md border', on ? 'border-gold-500 bg-gold-500 text-black' : 'border-line-2')}>
                {on && <Check size={14} strokeWidth={3} />}
              </span>
              <span className="min-w-0 flex-1 truncate text-[13.5px]">{s.name}</span>
              <span className="text-[13px] font-semibold tabular-nums text-gold-300">{money(s.price)}</span>
            </button>
          )
        })}
      </div>
      {items.some((i) => !i.serviceId) && (
        <ul className="space-y-1.5">
          {items
            .filter((i) => !i.serviceId)
            .map((i, idx) => (
              <li key={idx} className="flex items-center gap-2 rounded-xl border border-gold-500/40 bg-gold-500/5 px-3 py-2 text-sm">
                <span className="flex-1">{i.name}</span>
                <span className="font-semibold">{money(i.price)}</span>
                <button type="button" aria-label="Remover" onClick={() => setItems(items.filter((x) => x !== i))} className="p-1 text-muted hover:text-red-400">
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Input value={custom.name} onChange={(e) => setCustom({ ...custom, name: e.target.value })} placeholder="Item avulso (ex.: remoção de piche)" />
        <Input value={custom.price} onChange={(e) => setCustom({ ...custom, price: e.target.value })} placeholder="R$" inputMode="decimal" className="!w-24" />
        <Button
          size="icon"
          icon={Plus}
          className="!h-12 !w-12 shrink-0 sm:!h-11 sm:!w-11"
          aria-label="Adicionar item"
          onClick={() => {
            if (!custom.name.trim() || !num(custom.price)) return toast('Informe descrição e valor', 'error')
            setItems([...items, { name: custom.name.trim(), price: num(custom.price), qty: 1 }])
            setCustom({ name: '', price: '' })
          }}
        />
      </div>
    </div>
  )
}

function ClientVehiclePicker({
  clientId,
  vehicleId,
  onChange,
  err,
}: {
  clientId: string
  vehicleId: string
  onChange: (c: string, v: string) => void
  err: Record<string, string>
}) {
  const { clients, vehicles } = useDB()
  const sorted = useMemo(() => [...clients].sort((a, b) => a.name.localeCompare(b.name)), [clients])
  const own = vehicles.filter((v) => v.clientId === clientId)
  return (
    <Grid>
      <Field
        label="Cliente *"
        hint={
          err.clientId ? (
            <span className="text-red-400">{err.clientId}</span>
          ) : (
            <button type="button" className="inline-flex items-center gap-1 text-gold-400" onClick={() => openForm({ kind: 'client', preset: { onSaved: (id: string) => onChange(id, useDB.getState().vehicles.find((v) => v.clientId === id)?.id ?? '') } })}>
              <UserPlus size={13} /> Novo
            </button>
          )
        }
      >
        <Select
          value={clientId}
          onChange={(e) => {
            const cid = e.target.value
            const first = vehicles.find((v) => v.clientId === cid)
            onChange(cid, first?.id ?? '')
          }}
        >
          <option value="">Selecione…</option>
          {sorted.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field
        label="Veículo *"
        hint={
          err.vehicleId ? (
            <span className="text-red-400">{err.vehicleId}</span>
          ) : clientId ? (
            <button
              type="button"
              className="inline-flex items-center gap-1 text-gold-400"
              onClick={() => openForm({ kind: 'vehicle', preset: { clientId, onSaved: (id: string) => onChange(clientId, id) } })}
            >
              <Plus size={13} /> Novo
            </button>
          ) : null
        }
      >
        <Select value={vehicleId} onChange={(e) => onChange(clientId, e.target.value)} disabled={!clientId}>
          <option value="">{clientId ? (own.length ? 'Selecione…' : 'Nenhum veículo — cadastre') : 'Escolha o cliente'}</option>
          {own.map((v) => (
            <option key={v.id} value={v.id}>
              {v.brand} {v.model} · {fmtPlate(v.plate)}
            </option>
          ))}
        </Select>
      </Field>
    </Grid>
  )
}

function TotalBar({ items, discount, setDiscount }: { items: OrderItem[]; discount: number; setDiscount: (n: number) => void }) {
  const sub = itemsTotal(items)
  return (
    <div className="rounded-2xl border border-line bg-ink/50 p-4">
      <div className="flex items-center justify-between text-sm text-muted">
        <span>Subtotal ({items.length} {items.length === 1 ? 'item' : 'itens'})</span>
        <span className="tabular-nums">{money(sub)}</span>
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 text-sm text-muted">
        <span>Desconto</span>
        <input
          inputMode="decimal"
          value={discount ? String(discount).replace('.', ',') : ''}
          onChange={(e) => setDiscount(num(e.target.value))}
          placeholder="R$ 0,00"
          className="h-9 w-28 rounded-lg border border-line-2 bg-surface px-2.5 text-right text-base tabular-nums text-fg outline-none focus:border-gold-500 sm:text-sm"
        />
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
        <span className="font-medium">Total</span>
        <span className="font-display text-2xl font-semibold text-gold-gradient tabular-nums">{money(Math.max(0, sub - discount))}</span>
      </div>
    </div>
  )
}

/* ---------- OS / Agendamento ---------- */
function OrderForm({ id, preset }: { id?: string; preset?: Record<string, unknown> }) {
  const { orders, upsert, remove, nextOrderNumber } = useDB()
  const close = useUI((s) => s.closeForm)
  const existing = orders.find((o) => o.id === id)
  const now = !!preset?.now
  const [f, setF] = useState<Order>(
    existing ?? {
      id: uid(),
      number: 0,
      clientId: (preset?.clientId as string) ?? '',
      vehicleId: (preset?.vehicleId as string) ?? '',
      items: [],
      discount: 0,
      date: (preset?.date as string) ?? todayISO(),
      time: now ? nowTime() : (preset?.time as string) ?? '09:00',
      status: now ? 'andamento' : 'agendado',
      paid: false,
      createdAt: new Date().toISOString(),
    },
  )
  const [err, setErr] = useState<Record<string, string>>({})
  const set = <K extends keyof Order>(k: K, v: Order[K]) => setF((s) => ({ ...s, [k]: v }))

  const save = () => {
    const e: Record<string, string> = {}
    if (!f.clientId) e.clientId = 'Obrigatório'
    if (!f.vehicleId) e.vehicleId = 'Obrigatório'
    if (!f.items.length) e.items = 'Selecione ao menos um serviço'
    setErr(e)
    if (Object.keys(e).length) return toast('Preencha os campos obrigatórios', 'error')
    upsert('orders', { ...f, number: f.number || nextOrderNumber() })
    toast(existing ? 'OS atualizada' : now ? 'OS registrada' : 'Serviço agendado')
    close()
  }

  return (
    <Sheet
      open
      onClose={close}
      size="lg"
      title={existing ? `Editar OS #${existing.number}` : now ? 'Registrar OS' : 'Agendar serviço'}
      subtitle={now ? 'Atendimento imediato — já entra como “em andamento”' : undefined}
      footer={
        <>
          {existing && (
            <DeleteBtn
              label="OS"
              onDelete={() => {
                remove('orders', existing.id)
                toast('OS excluída')
                close()
                useUI.getState().openDetail(null)
              }}
            />
          )}
          <Button onClick={close}>Cancelar</Button>
          <Button variant="primary" onClick={save}>
            {existing ? 'Salvar' : now ? 'Registrar OS' : 'Agendar'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <ClientVehiclePicker clientId={f.clientId} vehicleId={f.vehicleId} err={err} onChange={(c, v) => setF((s) => ({ ...s, clientId: c, vehicleId: v }))} />
        <Grid>
          <Field label="Data">
            <Input type="date" value={f.date} onChange={(e) => set('date', e.target.value)} />
          </Field>
          <Field label="Horário">
            <Input type="time" value={f.time} onChange={(e) => set('time', e.target.value)} />
          </Field>
        </Grid>
        <Field label="Status">
          <Toggle
            value={f.status}
            onChange={(v) => set('status', v as OrderStatus)}
            options={(Object.keys(STATUS) as OrderStatus[]).map((k) => ({ value: k, label: STATUS[k].label }))}
          />
        </Field>
        <div>
          <p className="mb-2 flex items-center justify-between text-[12.5px] font-medium text-muted">
            Serviços *{err.items && <span className="text-red-400">{err.items}</span>}
          </p>
          <ItemsPicker items={f.items} setItems={(i) => set('items', i)} />
        </div>
        <Field label="Observações">
          <Textarea value={f.notes ?? ''} onChange={(e) => set('notes', e.target.value)} placeholder="Detalhes do serviço, pedidos do cliente…" />
        </Field>
        <TotalBar items={f.items} discount={f.discount} setDiscount={(n) => set('discount', n)} />
      </div>
    </Sheet>
  )
}

/* ---------- Orçamento ---------- */
function QuoteForm({ id, preset }: { id?: string; preset?: Record<string, unknown> }) {
  const { quotes, upsert, remove, nextQuoteNumber } = useDB()
  const close = useUI((s) => s.closeForm)
  const existing = quotes.find((o) => o.id === id)
  const [f, setF] = useState<Quote>(
    existing ?? {
      id: uid(),
      number: 0,
      clientId: (preset?.clientId as string) ?? '',
      vehicleId: (preset?.vehicleId as string) ?? '',
      items: [],
      discount: 0,
      validUntil: addDays(todayISO(), 7),
      status: 'pendente',
      createdAt: new Date().toISOString(),
    },
  )
  const [err, setErr] = useState<Record<string, string>>({})
  const set = <K extends keyof Quote>(k: K, v: Quote[K]) => setF((s) => ({ ...s, [k]: v }))
  const save = () => {
    const e: Record<string, string> = {}
    if (!f.clientId) e.clientId = 'Obrigatório'
    if (!f.vehicleId) e.vehicleId = 'Obrigatório'
    if (!f.items.length) e.items = 'Selecione ao menos um serviço'
    setErr(e)
    if (Object.keys(e).length) return toast('Preencha os campos obrigatórios', 'error')
    upsert('quotes', { ...f, number: f.number || nextQuoteNumber() })
    toast(existing ? 'Orçamento atualizado' : 'Orçamento criado')
    close()
  }
  return (
    <Sheet
      open
      onClose={close}
      size="lg"
      title={existing ? `Orçamento #${existing.number}` : 'Novo orçamento'}
      footer={
        <>
          {existing && (
            <DeleteBtn
              label="orçamento"
              onDelete={() => {
                remove('quotes', existing.id)
                toast('Orçamento excluído')
                close()
              }}
            />
          )}
          <Button onClick={close}>Cancelar</Button>
          <Button variant="primary" onClick={save}>
            Salvar orçamento
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <ClientVehiclePicker clientId={f.clientId} vehicleId={f.vehicleId} err={err} onChange={(c, v) => setF((s) => ({ ...s, clientId: c, vehicleId: v }))} />
        <Grid>
          <Field label="Válido até">
            <Input type="date" value={f.validUntil} onChange={(e) => set('validUntil', e.target.value)} />
          </Field>
          <Field label="Situação">
            <Select value={f.status} onChange={(e) => set('status', e.target.value as Quote['status'])}>
              <option value="pendente">Aguardando cliente</option>
              <option value="aprovado">Aprovado</option>
              <option value="recusado">Recusado</option>
              {f.status === 'convertido' && <option value="convertido">Convertido em OS</option>}
            </Select>
          </Field>
        </Grid>
        <div>
          <p className="mb-2 flex items-center justify-between text-[12.5px] font-medium text-muted">
            Serviços *{err.items && <span className="text-red-400">{err.items}</span>}
          </p>
          <ItemsPicker items={f.items} setItems={(i) => set('items', i)} />
        </div>
        <Field label="Observações">
          <Textarea value={f.notes ?? ''} onChange={(e) => set('notes', e.target.value)} />
        </Field>
        <TotalBar items={f.items} discount={f.discount} setDiscount={(n) => set('discount', n)} />
      </div>
    </Sheet>
  )
}

/* ---------- Lançamento financeiro ---------- */
const CATS_IN = ['Serviços', 'Venda de produtos', 'Outros']
const CATS_OUT = ['Produtos', 'Aluguel', 'Contas', 'Folha', 'Manutenção', 'Marketing', 'Impostos', 'Outros']
export const METHODS: PayMethod[] = ['Pix', 'Dinheiro', 'Crédito', 'Débito', 'A prazo']

function TransactionForm({ id, preset }: { id?: string; preset?: Record<string, unknown> }) {
  const { transactions, upsert, remove, clients } = useDB()
  const close = useUI((s) => s.closeForm)
  const existing = transactions.find((t) => t.id === id)
  const [f, setF] = useState<Transaction>(
    existing ?? { id: uid(), type: (preset?.type as 'in' | 'out') ?? 'in', category: preset?.type === 'out' ? 'Produtos' : 'Serviços', description: '', amount: 0, date: todayISO(), status: 'pago', method: 'Pix' },
  )
  const [amount, setAmount] = useState(existing ? String(existing.amount).replace('.', ',') : '')
  const set = <K extends keyof Transaction>(k: K, v: Transaction[K]) => setF((s) => ({ ...s, [k]: v }))
  const save = () => {
    if (!f.description.trim() || !num(amount)) return toast('Informe descrição e valor', 'error')
    upsert('transactions', { ...f, amount: num(amount), dueDate: f.status === 'pendente' ? f.dueDate ?? f.date : undefined })
    toast('Lançamento salvo')
    close()
  }
  return (
    <Sheet
      open
      onClose={close}
      title={existing ? 'Editar lançamento' : 'Novo lançamento'}
      footer={
        <>
          {existing && (
            <DeleteBtn
              label="lançamento"
              onDelete={() => {
                remove('transactions', existing.id)
                toast('Lançamento excluído')
                close()
              }}
            />
          )}
          <Button onClick={close}>Cancelar</Button>
          <Button variant="primary" onClick={save}>
            Salvar
          </Button>
        </>
      }
    >
      <div className="space-y-3.5">
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-ink/60 p-1">
          {(['in', 'out'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setF((s) => ({ ...s, type: t, category: t === 'in' ? 'Serviços' : 'Produtos' }))}
              className={cn('h-11 rounded-xl text-sm font-semibold transition', f.type === t ? (t === 'in' ? 'bg-ok/20 text-green-300' : 'bg-danger/20 text-red-300') : 'text-muted')}
            >
              {t === 'in' ? 'Entrada' : 'Saída / despesa'}
            </button>
          ))}
        </div>
        <Field label="Valor *">
          <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d,.]/g, ''))} placeholder="0,00" className="font-display !text-xl" />
        </Field>
        <Field label="Descrição *">
          <Input value={f.description} onChange={(e) => set('description', e.target.value)} placeholder={f.type === 'in' ? 'Ex.: Lavagem avulsa' : 'Ex.: Compra de shampoo'} />
        </Field>
        <Grid>
          <Field label="Categoria">
            <Select value={f.category} onChange={(e) => set('category', e.target.value)}>
              {(f.type === 'in' ? CATS_IN : CATS_OUT).map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <Field label="Forma de pagamento">
            <Select value={f.method ?? ''} onChange={(e) => set('method', e.target.value as PayMethod)}>
              {METHODS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </Select>
          </Field>
          <Field label="Data">
            <Input type="date" value={f.date} onChange={(e) => set('date', e.target.value)} />
          </Field>
          <Field label="Situação">
            <Toggle
              value={f.status}
              onChange={(v) => set('status', v)}
              options={[
                { value: 'pago', label: f.type === 'in' ? 'Recebido' : 'Pago' },
                { value: 'pendente', label: 'Pendente' },
              ]}
            />
          </Field>
          {f.status === 'pendente' && (
            <Field label="Vencimento">
              <Input type="date" value={f.dueDate ?? f.date} onChange={(e) => set('dueDate', e.target.value)} />
            </Field>
          )}
          {f.type === 'in' && (
            <Field label="Cliente (opcional)">
              <Select value={f.clientId ?? ''} onChange={(e) => set('clientId', e.target.value || undefined)}>
                <option value="">—</option>
                {[...clients]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </Select>
            </Field>
          )}
        </Grid>
      </div>
    </Sheet>
  )
}

/* ---------- Produto ---------- */
function ProductForm({ id }: { id?: string }) {
  const { products, upsert, remove } = useDB()
  const close = useUI((s) => s.closeForm)
  const existing = products.find((p) => p.id === id)
  const [f, setF] = useState<Product>(existing ?? { id: uid(), name: '', category: 'Lavagem', unit: 'un', qty: 0, minQty: 1, cost: 0 })
  const set = <K extends keyof Product>(k: K, v: Product[K]) => setF((s) => ({ ...s, [k]: v }))
  const save = () => {
    if (!f.name.trim()) return toast('Informe o nome do produto', 'error')
    upsert('products', f)
    toast('Produto salvo')
    close()
  }
  return (
    <Sheet
      open
      onClose={close}
      title={existing ? 'Editar produto' : 'Novo produto'}
      footer={
        <>
          {existing && (
            <DeleteBtn
              label="produto"
              onDelete={() => {
                remove('products', existing.id)
                toast('Produto excluído')
                close()
              }}
            />
          )}
          <Button onClick={close}>Cancelar</Button>
          <Button variant="primary" onClick={save}>
            Salvar
          </Button>
        </>
      }
    >
      <div className="space-y-3.5">
        <Field label="Produto *">
          <Input autoFocus value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Ex.: Shampoo automotivo" />
        </Field>
        <Grid>
          <Field label="Categoria">
            <Select value={f.category} onChange={(e) => set('category', e.target.value)}>
              {['Lavagem', 'Limpeza', 'Polimento', 'Proteção', 'Higienização', 'Acabamento', 'Acessórios'].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <Field label="Unidade">
            <Toggle value={f.unit} onChange={(v) => set('unit', v)} options={['un', 'L', 'kg', 'cx'].map((u) => ({ value: u, label: u }))} />
          </Field>
          <Field label="Quantidade atual">
            <Stepper value={f.qty} onChange={(n) => set('qty', n)} />
          </Field>
          <Field label="Estoque mínimo">
            <Stepper value={f.minQty} onChange={(n) => set('minQty', n)} />
          </Field>
          <Field label="Custo unitário (R$)">
            <Input inputMode="decimal" defaultValue={f.cost ? String(f.cost).replace('.', ',') : ''} onChange={(e) => set('cost', num(e.target.value))} placeholder="0,00" />
          </Field>
        </Grid>
      </div>
    </Sheet>
  )
}
export function Stepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex h-12 items-center rounded-xl border border-line-2 bg-ink/60 sm:h-11">
      <button type="button" aria-label="Diminuir" className="grid h-full w-12 place-items-center text-gold-400" onClick={() => onChange(Math.max(0, value - 1))}>
        <Minus size={18} />
      </button>
      <input
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(Number(onlyDigits(e.target.value)) || 0)}
        className="h-full min-w-0 flex-1 bg-transparent text-center text-base font-semibold tabular-nums outline-none"
      />
      <button type="button" aria-label="Aumentar" className="grid h-full w-12 place-items-center text-gold-400" onClick={() => onChange(value + 1)}>
        <Plus size={18} />
      </button>
    </div>
  )
}

/* ---------- Serviço ---------- */
function ServiceForm({ id }: { id?: string }) {
  const { services, upsert, remove } = useDB()
  const close = useUI((s) => s.closeForm)
  const existing = services.find((p) => p.id === id)
  const [f, setF] = useState<Service>(existing ?? { id: uid(), name: '', category: 'Lavagem', price: 0, duration: 60, active: true })
  const set = <K extends keyof Service>(k: K, v: Service[K]) => setF((s) => ({ ...s, [k]: v }))
  const save = () => {
    if (!f.name.trim() || !f.price) return toast('Informe nome e preço', 'error')
    upsert('services', f)
    toast('Serviço salvo')
    close()
  }
  return (
    <Sheet
      open
      onClose={close}
      title={existing ? 'Editar serviço' : 'Novo serviço'}
      footer={
        <>
          {existing && (
            <DeleteBtn
              label="serviço"
              onDelete={() => {
                remove('services', existing.id)
                toast('Serviço excluído')
                close()
              }}
            />
          )}
          <Button onClick={close}>Cancelar</Button>
          <Button variant="primary" onClick={save}>
            Salvar
          </Button>
        </>
      }
    >
      <div className="space-y-3.5">
        <Field label="Nome do serviço *">
          <Input autoFocus value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Ex.: Lavagem completa" />
        </Field>
        <Field label="Categoria">
          <Toggle value={f.category} onChange={(v) => set('category', v)} options={(['Lavagem', 'Higienização', 'Estética', 'Proteção', 'Outros'] as const).map((c) => ({ value: c, label: c }))} />
        </Field>
        <Grid>
          <Field label="Preço (R$) *">
            <Input inputMode="decimal" defaultValue={f.price ? String(f.price).replace('.', ',') : ''} onChange={(e) => set('price', num(e.target.value))} placeholder="0,00" />
          </Field>
          <Field label="Duração média">
            <Select value={f.duration} onChange={(e) => set('duration', Number(e.target.value))}>
              {[0, 30, 40, 45, 60, 90, 120, 150, 180, 240, 300, 360, 480].map((m) => (
                <option key={m} value={m}>
                  {m === 0 ? '—' : m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}min` : ''}`}
                </option>
              ))}
            </Select>
          </Field>
        </Grid>
        <label className="flex items-center justify-between rounded-xl border border-line-2 bg-ink/40 px-4 py-3">
          <span className="text-sm">Disponível para agendamento</span>
          <Switch checked={f.active} onChange={(v) => set('active', v)} />
        </label>
      </div>
    </Sheet>
  )
}
export function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn('relative h-7 w-12 shrink-0 rounded-full transition', checked ? 'bg-gold-500' : 'bg-surface-3 ring-1 ring-line-2')}
    >
      <span className={cn('absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all', checked ? 'left-6' : 'left-1')} />
    </button>
  )
}

/* ---------- Host ---------- */
// Renderiza a pilha inteira para não perder o que já foi digitado ao abrir um sub-formulário
export function FormHost() {
  const form = useUI((s) => s.form)
  const stack = useUI((s) => s.stack)
  if (!form) return null
  return (
    <>
      {[...stack, form].map((f, i) => (
        <FormSwitch key={`${i}-${f.kind}-${f.id ?? 'new'}`} f={f} />
      ))}
    </>
  )
}
function FormSwitch({ f }: { f: NonNullable<ReturnType<typeof useUI.getState>['form']> }) {
  switch (f.kind) {
    case 'client':
      return <ClientForm id={f.id} preset={f.preset} />
    case 'vehicle':
      return <VehicleForm id={f.id} preset={f.preset} />
    case 'order':
      return <OrderForm id={f.id} preset={f.preset} />
    case 'quote':
      return <QuoteForm id={f.id} preset={f.preset} />
    case 'transaction':
      return <TransactionForm id={f.id} preset={f.preset} />
    case 'product':
      return <ProductForm id={f.id} />
    case 'service':
      return <ServiceForm id={f.id} />
    case 'inspection':
      return <InspectionForm id={f.id} preset={f.preset} />
  }
}
