import { useState } from 'react'
import { Camera, Check, ClipboardCheck, Fuel, Gauge, Plus, Send, TriangleAlert } from 'lucide-react'
import { CarDiagram } from '../components/InspectionForm'
import { Button, Empty, PageHeader, Plate } from '../components/ui'
import type { Client, Inspection } from '../lib/types'
import { buildMessage, sendInspection } from '../lib/wa'
import { fmtDate, fmtPlate } from '../lib/utils'
import { useClientMap, useDB, useVehicleMap } from '../store/data'
import { openForm, toast } from '../store/ui'

const FUEL = ['Reserva', '1/4', '1/2', '3/4', 'Cheio']

export default function Vistoria() {
  const inspections = useDB((s) => s.inspections)
  const cm = useClientMap()
  const vm = useVehicleMap()
  const [sent, setSent] = useState<Set<string>>(new Set())
  const sorted = [...inspections].sort((a, b) => b.date.localeCompare(a.date))

  const send = async (i: Inspection, c: Client) => {
    const v = vm.get(i.vehicleId)
    const text = buildMessage('t6', { client: c, vehicle: v, inspection: i, date: i.date })
    const result = await sendInspection(c.phone, text, i.photos)
    if (result === 'cancelled') return
    setSent((prev) => new Set(prev).add(i.id))
    toast(result === 'shared' ? 'Fotos e mensagem compartilhadas' : 'Abrindo WhatsApp…', 'info')
  }

  return (
    <div>
      <PageHeader
        title="Vistoria"
        subtitle="Registro de entrada do veículo: avarias, fotos e checklist"
        actions={
          <Button variant="primary" icon={Plus} onClick={() => openForm({ kind: 'inspection' })}>
            Nova vistoria
          </Button>
        }
      />
      <div className="mb-4 flex items-start gap-3 rounded-2xl border border-gold-500/20 bg-gold-500/[0.05] p-4 text-sm">
        <TriangleAlert size={20} className="mt-0.5 shrink-0 text-gold-400" />
        <p className="text-muted">
          <b className="text-fg">Proteja seu negócio:</b> faça a vistoria antes de começar o serviço. Marque riscos e amassados no desenho e tire fotos — evita discussão na hora da entrega.
        </p>
      </div>
      {!sorted.length ? (
        <div className="card">
          <Empty icon={ClipboardCheck} title="Nenhuma vistoria" action={<Button variant="primary" icon={Plus} onClick={() => openForm({ kind: 'inspection' })}>Fazer vistoria</Button>} />
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {sorted.map((i) => {
            const c = cm.get(i.clientId)
            const v = vm.get(i.vehicleId)
            const ok = Object.values(i.checklist).filter(Boolean).length
            const done = sent.has(i.id)
            return (
              <li key={i.id} className="card p-4 transition hover:border-gold-500/40">
                <button onClick={() => openForm({ kind: 'inspection', id: i.id })} className="block w-full text-left">
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{v ? `${v.brand} ${v.model}` : '—'}</p>
                      <p className="flex items-center gap-2 text-[12.5px] text-muted">
                        {v && <Plate plate={fmtPlate(v.plate)} />} {c?.name}
                      </p>
                    </div>
                    <span className="shrink-0 text-[12px] text-subtle">{fmtDate(i.date)}</span>
                  </div>
                  <CarDiagram damages={i.damages} readOnly />
                  <div className="mt-3 grid grid-cols-4 gap-2 text-center text-[11.5px]">
                    <Info icon={TriangleAlert} label="Avarias" value={String(i.damages.length)} warn={i.damages.length > 0} />
                    <Info icon={Camera} label="Fotos" value={String(i.photos.length)} />
                    <Info icon={Fuel} label="Tanque" value={FUEL[i.fuel]} />
                    <Info icon={Gauge} label="Checklist" value={`${ok}/${Object.keys(i.checklist).length}`} />
                  </div>
                  {i.notes && <p className="mt-3 line-clamp-2 text-[12.5px] text-muted">📝 {i.notes}</p>}
                </button>
                {c && (
                  <Button
                    size="sm"
                    variant={done ? 'secondary' : 'whatsapp'}
                    icon={done ? Check : Send}
                    className="mt-3 w-full"
                    onClick={() => send(i, c)}
                  >
                    {done ? 'Enviado ao cliente' : 'Enviar vistoria ao cliente'}
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function Info({ icon: Icon, label, value, warn }: { icon: typeof Camera; label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-xl bg-ink/50 px-1 py-2 ring-1 ring-line">
      <Icon size={15} className={warn ? 'mx-auto text-red-400' : 'mx-auto text-gold-400'} />
      <p className="mt-1 font-semibold text-fg">{value}</p>
      <p className="text-subtle">{label}</p>
    </div>
  )
}
