import { useMemo, useState } from 'react'
import { BellRing, Check, HandCoins, Heart, MessageCircle, Pencil, Send, Sparkles, Plus, Trash2 } from 'lucide-react'
import { Avatar, Button, Card, Field, Input, PageHeader, Select, Sheet, Textarea } from '../components/ui'
import type { Client, Order, Vehicle } from '../lib/types'
import { addDays, cn, fmtDate, money, orderTitle, todayISO, uid } from '../lib/utils'
import { buildMessage, fillFromCtx, openWhatsApp } from '../lib/wa'
import { useClientMap, useDB, useVehicleMap } from '../store/data'
import { confirmDialog, toast } from '../store/ui'

interface Suggestion {
  key: string
  client: Client
  vehicle?: Vehicle
  text: string
  sub: string
}

export default function WhatsApp() {
  const orders = useDB((s) => s.orders)
  const transactions = useDB((s) => s.transactions)
  const settings = useDB((s) => s.settings)
  const cm = useClientMap()
  const vm = useVehicleMap()
  const [sent, setSent] = useState<Set<string>>(new Set())
  const today = todayISO()
  const tomorrow = addDays(today, 1)

  const groups = useMemo(() => {
    const mk = (o: Order, tpl: string, sub: string): Suggestion | null => {
      const client = cm.get(o.clientId)
      if (!client) return null
      const vehicle = vm.get(o.vehicleId)
      return { key: `${tpl}-${o.id}`, client, vehicle, text: buildMessage(tpl, { client, vehicle, order: o }), sub }
    }
    const ready = orders.filter((o) => o.status === 'pronto').map((o) => mk(o, 't2', `${vm.get(o.vehicleId)?.model ?? ''} está pronto`))
    const remind = orders
      .filter((o) => o.date === tomorrow && o.status === 'agendado')
      .sort((a, b) => a.time.localeCompare(b.time))
      .map((o) => mk(o, 't1', `Amanhã às ${o.time} · ${orderTitle(o)}`))
    const charge = transactions
      .filter((t) => t.type === 'in' && t.status === 'pendente' && t.clientId && (t.dueDate ?? t.date) <= addDays(today, 3))
      .map((t): Suggestion | null => {
        const client = cm.get(t.clientId!)
        if (!client) return null
        const vehicle = [...vm.values()].find((v) => v.clientId === client.id)
        return {
          key: `t4-${t.id}`,
          client,
          vehicle,
          text: buildMessage('t4', { client, vehicle, value: t.amount, date: t.dueDate ?? t.date }),
          sub: `${money(t.amount)} · vence ${fmtDate(t.dueDate)}`,
        }
      })
    const post = orders
      .filter((o) => o.status === 'entregue' && o.date === addDays(today, -1))
      .slice(0, 6)
      .map((o) => mk(o, 't5', `Atendido ontem · ${orderTitle(o)}`))
    const clean = (a: (Suggestion | null)[]) => a.filter(Boolean) as Suggestion[]
    return [
      { title: 'Veículos prontos', icon: Sparkles, color: 'text-green-400', items: clean(ready), empty: 'Nenhum carro aguardando retirada.' },
      { title: 'Lembretes de amanhã', icon: BellRing, color: 'text-gold-400', items: clean(remind), empty: 'Nenhum agendamento amanhã.' },
      { title: 'Cobranças', icon: HandCoins, color: 'text-red-400', items: clean(charge), empty: 'Nenhuma conta vencendo.' },
      { title: 'Pós-venda', icon: Heart, color: 'text-purple-400', items: clean(post), empty: 'Ninguém atendido ontem.' },
    ]
    // settings entra como dependência porque os modelos podem ser editados
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, transactions, cm, vm, today, tomorrow, settings.templates])

  const send = (s: Suggestion) => {
    openWhatsApp(s.client.phone, s.text)
    setSent((prev) => new Set(prev).add(s.key))
  }
  const total = groups.reduce((n, g) => n + g.items.length, 0)

  return (
    <div>
      <PageHeader title="WhatsApp" subtitle="Mensagens prontas para seus clientes — um toque e está enviado" />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-2xl border border-[#25d366]/25 bg-[#25d366]/[0.06] p-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#1faa59] text-white">
              <MessageCircle size={22} />
            </span>
            <p className="text-sm">
              <b>{total} mensagens sugeridas</b> para hoje.
              <span className="block text-muted">O WhatsApp abre com o texto pronto — é só confirmar o envio.</span>
            </p>
          </div>
          {groups.map((g) => (
            <Card
              key={g.title}
              title={
                <span className="flex items-center gap-2">
                  <g.icon size={18} className={g.color} /> {g.title}
                  <span className="rounded-full bg-white/5 px-2 text-xs font-normal text-muted">{g.items.length}</span>
                </span>
              }
              bodyClass="!px-2 sm:!px-3"
            >
              {!g.items.length && <p className="px-2 py-3 text-sm text-muted">{g.empty}</p>}
              <ul className="divide-y divide-line/60">
                {g.items.map((s) => {
                  const done = sent.has(s.key)
                  return (
                    <li key={s.key} className="flex items-center gap-3 px-2 py-2.5">
                      <Avatar name={s.client.name} size={40} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-medium">{s.client.name}</span>
                        <span className="block truncate text-[12.5px] text-muted">{s.sub}</span>
                      </span>
                      <Button size="sm" variant={done ? 'secondary' : 'whatsapp'} icon={done ? Check : Send} onClick={() => send(s)}>
                        {done ? 'Enviado' : 'Enviar'}
                      </Button>
                    </li>
                  )
                })}
              </ul>
            </Card>
          ))}
        </div>
        <div className="space-y-4">
          <Composer />
          <Templates />
        </div>
      </div>
    </div>
  )
}

function Composer() {
  const clients = useDB((s) => s.clients)
  const vehicles = useDB((s) => s.vehicles)
  const templates = useDB((s) => s.settings.templates)
  const [cid, setCid] = useState('')
  const [tid, setTid] = useState(templates[0]?.id ?? '')
  const [text, setText] = useState('')
  const sorted = useMemo(() => [...clients].sort((a, b) => a.name.localeCompare(b.name)), [clients])

  const regen = (c: string, t: string) => {
    const client = clients.find((x) => x.id === c)
    const vehicle = vehicles.find((v) => v.clientId === c)
    const tpl = templates.find((x) => x.id === t)?.text ?? ''
    setText(client ? fillFromCtx(tpl, { client, vehicle }) : '')
  }
  const client = clients.find((x) => x.id === cid)

  return (
    <Card title="Mensagem personalizada">
      <div className="space-y-3">
        <Field label="Cliente">
          <Select
            value={cid}
            onChange={(e) => {
              setCid(e.target.value)
              regen(e.target.value, tid)
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
        <Field label="Modelo">
          <Select
            value={tid}
            onChange={(e) => {
              setTid(e.target.value)
              regen(cid, e.target.value)
            }}
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Prévia (pode editar)">
          <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} placeholder="Escolha um cliente para gerar a mensagem" />
        </Field>
        <Button
          variant="whatsapp"
          icon={Send}
          className="w-full"
          disabled={!client || !text.trim()}
          onClick={() => {
            if (client) {
              openWhatsApp(client.phone, text)
              toast('Abrindo WhatsApp…', 'info')
            }
          }}
        >
          Abrir no WhatsApp
        </Button>
      </div>
    </Card>
  )
}

function Templates() {
  const templates = useDB((s) => s.settings.templates)
  const updateSettings = useDB((s) => s.updateSettings)
  const [edit, setEdit] = useState<{ id: string; title: string; text: string } | null>(null)
  const save = () => {
    if (!edit || !edit.title.trim() || !edit.text.trim()) return toast('Preencha título e texto', 'error')
    const exists = templates.some((t) => t.id === edit.id)
    updateSettings({ templates: exists ? templates.map((t) => (t.id === edit.id ? edit : t)) : [...templates, edit] })
    toast('Modelo salvo')
    setEdit(null)
  }
  return (
    <Card title="Modelos de mensagem" action={<Button size="sm" variant="ghost" icon={Plus} onClick={() => setEdit({ id: uid(), title: '', text: '' })}>Novo</Button>}>
      <ul className="space-y-2">
        {templates.map((t) => (
          <li key={t.id}>
            <button onClick={() => setEdit({ ...t })} className="flex w-full items-start gap-3 rounded-xl border border-line bg-ink/40 p-3 text-left hover:border-line-2">
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{t.title}</span>
                <span className="line-clamp-2 text-[12.5px] text-muted">{t.text}</span>
              </span>
              <Pencil size={15} className="mt-0.5 shrink-0 text-gold-400" />
            </button>
          </li>
        ))}
      </ul>
      <Sheet
        open={!!edit}
        onClose={() => setEdit(null)}
        title="Modelo de mensagem"
        footer={
          <>
            {edit && ['t1', 't2', 't3', 't4', 't5'].indexOf(edit.id) === -1 && templates.some((t) => t.id === edit.id) && (
              <Button
                variant="danger"
                icon={Trash2}
                className="!flex-none"
                aria-label="Excluir modelo"
                onClick={async () => {
                  if (edit && (await confirmDialog({ title: 'Excluir modelo?', danger: true, confirmLabel: 'Excluir' }))) {
                    updateSettings({ templates: templates.filter((t) => t.id !== edit.id) })
                    setEdit(null)
                  }
                }}
              />
            )}
            <Button onClick={() => setEdit(null)}>Cancelar</Button>
            <Button variant="primary" onClick={save}>
              Salvar
            </Button>
          </>
        }
      >
        {edit && (
          <div className="space-y-3.5">
            <Field label="Título">
              <Input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} />
            </Field>
            <Field label="Texto">
              <Textarea rows={7} value={edit.text} onChange={(e) => setEdit({ ...edit, text: e.target.value })} />
            </Field>
            <div>
              <p className="mb-1.5 text-[12px] text-muted">Toque para inserir variáveis:</p>
              <div className="flex flex-wrap gap-1.5">
                {['nome', 'veiculo', 'servico', 'data', 'hora', 'valor', 'itens', 'empresa'].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setEdit({ ...edit, text: `${edit.text}{${v}}` })}
                    className={cn('rounded-lg border border-gold-500/30 bg-gold-500/5 px-2 py-1 font-mono text-[12px] text-gold-300')}
                  >
                    {`{${v}}`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </Sheet>
    </Card>
  )
}
