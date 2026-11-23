import { useMemo, useRef, useState } from 'react'
import { Camera, Check, Fuel, Send, Trash2, X } from 'lucide-react'
import type { Damage, Inspection } from '../lib/types'
import { CHECKLIST_ITEMS } from '../lib/seed'
import { cn, compressImage, fmtPlate, todayISO, uid } from '../lib/utils'
import { buildMessage, sendInspection } from '../lib/wa'
import { useDB } from '../store/data'
import { confirmDialog, toast, useUI } from '../store/ui'
import { Button, Field, Input, Select, Sheet, Textarea } from './ui'

const KINDS: Damage['kind'][] = ['Risco', 'Amassado', 'Trinca', 'Pintura', 'Outro']
export const KIND_COLOR: Record<Damage['kind'], string> = {
  Risco: '#f5b81c',
  Amassado: '#ef4444',
  Trinca: '#3b82f6',
  Pintura: '#a855f7',
  Outro: '#94a3b8',
}
const FUEL = ['Reserva', '1/4', '1/2', '3/4', 'Cheio']

/** Vista superior do carro (SVG) — toque para marcar avarias */
export function CarDiagram({ damages, onAdd, onRemove, readOnly }: { damages: Damage[]; onAdd?: (x: number, y: number) => void; onRemove?: (id: string) => void; readOnly?: boolean }) {
  const ref = useRef<SVGSVGElement>(null)
  const click = (e: React.MouseEvent) => {
    if (readOnly || !onAdd || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    onAdd((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height)
  }
  return (
    <div className={cn('relative overflow-hidden rounded-2xl border border-line bg-[radial-gradient(circle_at_50%_50%,#1a1a20,#0c0c0f)]', !readOnly && 'cursor-crosshair')}>
      <svg ref={ref} viewBox="0 0 400 200" className="block w-full touch-manipulation" onClick={click} role="img" aria-label="Diagrama do veículo">
        <g fill="none" stroke="#6f6f7a" strokeWidth="2" strokeLinejoin="round">
          {/* carroceria */}
          <path d="M40 60 Q42 30 80 26 L300 22 Q350 22 368 50 Q378 70 378 100 Q378 130 368 150 Q350 178 300 178 L80 174 Q42 170 40 140 Q34 100 40 60Z" fill="#141418" />
          {/* para-brisa e vidro traseiro */}
          <path d="M270 40 Q300 60 300 100 Q300 140 270 160 L245 150 Q258 125 258 100 Q258 75 245 50Z" fill="#1d2230" />
          <path d="M92 46 Q76 70 76 100 Q76 130 92 154 L112 146 Q104 125 104 100 Q104 75 112 54Z" fill="#1d2230" />
          {/* teto */}
          <rect x="116" y="50" width="126" height="100" rx="18" fill="#18181d" />
          {/* capô linhas */}
          <path d="M310 60 Q330 100 310 140" />
          <path d="M60 70 Q50 100 60 130" />
          {/* retrovisores */}
          <path d="M252 24 l8 -10 h14 l-4 12" fill="#141418" />
          <path d="M252 176 l8 10 h14 l-4 -12" fill="#141418" />
          {/* rodas */}
          <rect x="88" y="12" width="46" height="12" rx="5" fill="#2a2a31" />
          <rect x="88" y="176" width="46" height="12" rx="5" fill="#2a2a31" />
          <rect x="286" y="12" width="46" height="12" rx="5" fill="#2a2a31" />
          <rect x="286" y="176" width="46" height="12" rx="5" fill="#2a2a31" />
          {/* faróis */}
          <path d="M366 58 l8 10" stroke="#f5b81c" strokeWidth="4" strokeLinecap="round" />
          <path d="M366 142 l8 -10" stroke="#f5b81c" strokeWidth="4" strokeLinecap="round" />
          <path d="M44 62 l-4 12" stroke="#ef4444" strokeWidth="4" strokeLinecap="round" />
          <path d="M44 138 l-4 -12" stroke="#ef4444" strokeWidth="4" strokeLinecap="round" />
        </g>
        <text x="392" y="104" fill="#6f6f7a" fontSize="10" textAnchor="middle" transform="rotate(90 392 104)">FRENTE</text>
        {damages.map((d, i) => (
          <g
            key={d.id}
            transform={`translate(${d.x * 400} ${d.y * 200})`}
            onClick={(e) => {
              e.stopPropagation()
              onRemove?.(d.id)
            }}
            className={onRemove ? 'cursor-pointer' : ''}
          >
            <circle r="13" fill={KIND_COLOR[d.kind]} opacity=".25" />
            <circle r="8.5" fill={KIND_COLOR[d.kind]} stroke="#0b0b0e" strokeWidth="2" />
            <text y="3.5" textAnchor="middle" fontSize="10" fontWeight="700" fill="#0b0b0e">
              {i + 1}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}

export function InspectionForm({ id, preset }: { id?: string; preset?: Record<string, unknown> }) {
  const { inspections, clients, vehicles, upsert, remove } = useDB()
  const close = useUI((s) => s.closeForm)
  const existing = inspections.find((i) => i.id === id)
  const [f, setF] = useState<Inspection>(
    existing ?? {
      id: uid(),
      clientId: (preset?.clientId as string) ?? '',
      vehicleId: (preset?.vehicleId as string) ?? '',
      orderId: preset?.orderId as string | undefined,
      date: todayISO(),
      km: '',
      fuel: 2,
      checklist: Object.fromEntries(CHECKLIST_ITEMS.map((c) => [c, false])),
      damages: [],
      photos: [],
      notes: '',
    },
  )
  const [kind, setKind] = useState<Damage['kind']>('Risco')
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const set = <K extends keyof Inspection>(k: K, v: Inspection[K]) => setF((s) => ({ ...s, [k]: v }))
  const sorted = useMemo(() => [...clients].sort((a, b) => a.name.localeCompare(b.name)), [clients])
  const own = vehicles.filter((v) => v.clientId === f.clientId)

  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return
    setBusy(true)
    try {
      const room = 6 - f.photos.length
      const list = await Promise.all([...files].slice(0, room).map((file) => compressImage(file)))
      set('photos', [...f.photos, ...list])
      if (files.length > room) toast('Máximo de 6 fotos por vistoria', 'info')
    } catch {
      toast('Não foi possível carregar a foto', 'error')
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const save = () => {
    if (!f.clientId || !f.vehicleId) return toast('Selecione cliente e veículo', 'error')
    try {
      upsert('inspections', f)
      toast(existing ? 'Vistoria atualizada' : 'Vistoria registrada')
      close()
    } catch {
      toast('Armazenamento cheio — remova algumas fotos', 'error')
    }
  }

  const saveAndSend = async () => {
    if (!f.clientId || !f.vehicleId) return toast('Selecione cliente e veículo', 'error')
    const client = clients.find((c) => c.id === f.clientId)
    const vehicle = vehicles.find((v) => v.id === f.vehicleId)
    if (!client) return
    try {
      upsert('inspections', f)
    } catch {
      return toast('Armazenamento cheio — remova algumas fotos', 'error')
    }
    const text = buildMessage('t6', { client, vehicle, inspection: f, date: f.date })
    const result = await sendInspection(client.phone, text, f.photos)
    if (result === 'cancelled') return
    toast(result === 'shared' ? 'Fotos e mensagem compartilhadas' : 'Abrindo WhatsApp…', 'info')
    close()
  }

  const checked = Object.values(f.checklist).filter(Boolean).length

  return (
    <Sheet
      open
      onClose={close}
      size="lg"
      title={existing ? 'Editar vistoria' : 'Nova vistoria'}
      subtitle="Registre o estado do veículo na entrada"
      footer={
        <>
          {existing && (
            <Button
              variant="danger"
              icon={Trash2}
              className="!flex-none"
              aria-label="Excluir vistoria"
              onClick={async () => {
                if (await confirmDialog({ title: 'Excluir vistoria?', danger: true, confirmLabel: 'Excluir' })) {
                  remove('inspections', existing.id)
                  toast('Vistoria excluída')
                  close()
                }
              }}
            />
          )}
          <Button onClick={close}>Cancelar</Button>
          <Button variant="primary" onClick={save} disabled={busy}>
            Salvar
          </Button>
          <Button variant="whatsapp" icon={Send} onClick={saveAndSend} disabled={busy || !f.clientId || !f.vehicleId}>
            Enviar ao cliente
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="Cliente *">
            <Select
              value={f.clientId}
              onChange={(e) => setF((s) => ({ ...s, clientId: e.target.value, vehicleId: vehicles.find((v) => v.clientId === e.target.value)?.id ?? '' }))}
            >
              <option value="">Selecione…</option>
              {sorted.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Veículo *">
            <Select value={f.vehicleId} onChange={(e) => set('vehicleId', e.target.value)} disabled={!f.clientId}>
              <option value="">Selecione…</option>
              {own.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.brand} {v.model} · {fmtPlate(v.plate)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Data">
            <Input type="date" value={f.date} onChange={(e) => set('date', e.target.value)} />
          </Field>
          <Field label="Quilometragem">
            <Input inputMode="numeric" value={f.km} onChange={(e) => set('km', e.target.value.replace(/[^\d.]/g, ''))} placeholder="Ex.: 45.000" />
          </Field>
        </div>

        <div>
          <p className="mb-2 flex items-center gap-2 text-[12.5px] font-medium text-muted">
            <Fuel size={15} className="text-gold-400" /> Nível de combustível
          </p>
          <div className="grid grid-cols-5 gap-1.5">
            {FUEL.map((l, i) => (
              <button
                key={l}
                type="button"
                onClick={() => set('fuel', i)}
                className={cn('flex h-12 flex-col items-center justify-center rounded-xl border text-[12px] font-medium transition', i <= f.fuel ? 'border-gold-500/70 bg-gold-500/15 text-gold-200' : 'border-line-2 text-subtle')}
              >
                <span className={cn('mb-1 h-1.5 w-6 rounded-full', i <= f.fuel ? 'bg-gold-400' : 'bg-surface-3')} />
                {l}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 flex items-center justify-between text-[12.5px] font-medium text-muted">
            Avarias — toque no carro para marcar
            <span className="text-subtle">{f.damages.length} marcada(s)</span>
          </p>
          <div className="no-scrollbar -mx-5 mb-2.5 flex gap-2 overflow-x-auto px-5">
            {KINDS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={cn('flex h-9 shrink-0 items-center gap-2 rounded-full border px-3 text-[13px]', kind === k ? 'border-gold-500 bg-white/5 text-fg' : 'border-line-2 text-muted')}
              >
                <span className="h-3 w-3 rounded-full" style={{ background: KIND_COLOR[k] }} />
                {k}
              </button>
            ))}
          </div>
          <CarDiagram
            damages={f.damages}
            onAdd={(x, y) => set('damages', [...f.damages, { id: uid(), x, y, kind }])}
            onRemove={(did) => set('damages', f.damages.filter((d) => d.id !== did))}
          />
          {!!f.damages.length && (
            <ul className="mt-2.5 space-y-2">
              {f.damages.map((d, i) => (
                <li key={d.id} className="flex items-center gap-2.5">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-bold text-black" style={{ background: KIND_COLOR[d.kind] }}>
                    {i + 1}
                  </span>
                  <span className="w-20 shrink-0 text-sm">{d.kind}</span>
                  <input
                    value={d.note ?? ''}
                    onChange={(e) => set('damages', f.damages.map((x) => (x.id === d.id ? { ...x, note: e.target.value } : x)))}
                    placeholder="Descrição (opcional)"
                    className="h-10 min-w-0 flex-1 rounded-lg border border-line-2 bg-ink/60 px-3 text-base outline-none focus:border-gold-500 sm:text-sm"
                  />
                  <button type="button" aria-label="Remover avaria" onClick={() => set('damages', f.damages.filter((x) => x.id !== d.id))} className="grid h-10 w-10 place-items-center text-muted hover:text-red-400">
                    <X size={17} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className="mb-2 flex items-center justify-between text-[12.5px] font-medium text-muted">
            Checklist de entrada
            <span className="text-subtle">
              {checked}/{CHECKLIST_ITEMS.length}
            </span>
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {CHECKLIST_ITEMS.map((c) => {
              const on = !!f.checklist[c]
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => set('checklist', { ...f.checklist, [c]: !on })}
                  className={cn('flex items-center gap-3 rounded-xl border px-3 py-3 text-left text-[13.5px] transition', on ? 'border-ok/40 bg-ok/10' : 'border-line-2 bg-ink/40')}
                >
                  <span className={cn('grid h-5 w-5 shrink-0 place-items-center rounded-md border', on ? 'border-ok bg-ok text-black' : 'border-line-2')}>{on && <Check size={14} strokeWidth={3} />}</span>
                  {c}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <p className="mb-2 text-[12.5px] font-medium text-muted">Fotos ({f.photos.length}/6)</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {f.photos.map((p, i) => (
              <div key={i} className="group relative aspect-square overflow-hidden rounded-xl border border-line">
                <img src={p} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
                <button
                  type="button"
                  aria-label="Remover foto"
                  onClick={() => set('photos', f.photos.filter((_, j) => j !== i))}
                  className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-black/70 text-white"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            {f.photos.length < 6 && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-gold-500/40 text-[12px] text-gold-300 hover:bg-gold-500/5"
              >
                <Camera size={22} />
                {busy ? 'Carregando…' : 'Adicionar'}
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" multiple hidden onChange={(e) => addPhotos(e.target.files)} />
        </div>

        <Field label="Observações">
          <Textarea value={f.notes ?? ''} onChange={(e) => set('notes', e.target.value)} placeholder="Objetos no carro, pedidos do cliente…" />
        </Field>
      </div>
    </Sheet>
  )
}
