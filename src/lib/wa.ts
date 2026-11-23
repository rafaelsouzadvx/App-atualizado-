import type { Client, Inspection, Order, Quote, Vehicle } from './types'
import { fillTemplate, fmtDate, money, orderTotal, waLink } from './utils'
import { useDB } from '../store/data'

const FUEL_LABELS = ['Reserva', '1/4', '1/2', '3/4', 'Cheio']

interface MessageCtx {
  client?: Client
  vehicle?: Vehicle
  order?: Order | Quote
  inspection?: Inspection
  value?: number
  date?: string
}

export function buildMessage(tplId: string, ctx: MessageCtx) {
  const { settings } = useDB.getState()
  const tpl = settings.templates.find((t) => t.id === tplId)?.text ?? ''
  return fillFromCtx(tpl, ctx)
}

export function fillFromCtx(tpl: string, ctx: MessageCtx) {
  const { settings } = useDB.getState()
  const o = ctx.order
  const insp = ctx.inspection
  const checklistOk = insp ? Object.values(insp.checklist).filter(Boolean).length : 0
  const checklistTotal = insp ? Object.keys(insp.checklist).length : 0
  return fillTemplate(tpl, {
    nome: ctx.client?.name.split(' ')[0] ?? 'cliente',
    veiculo: ctx.vehicle ? `${ctx.vehicle.model}${ctx.vehicle.plate ? ` (${ctx.vehicle.plate})` : ''}` : 'veículo',
    servico: o ? o.items.map((i) => i.name).join(' + ') : 'serviço',
    data: ctx.date ? fmtDate(ctx.date) : o && 'date' in o ? fmtDate(o.date) : '',
    hora: o && 'time' in o ? o.time : '',
    valor: money(ctx.value ?? (o ? orderTotal(o) : 0)),
    itens: o ? o.items.map((i) => `• ${i.name} — ${money(i.price * i.qty)}`).join('\n') + (o.discount ? `\n• Desconto — -${money(o.discount)}` : '') : '',
    km: insp?.km ? `${insp.km} km` : '',
    combustivel: insp ? FUEL_LABELS[insp.fuel] : '',
    checklist: insp ? `${checklistOk}/${checklistTotal} itens conferidos` : '',
    avarias: insp
      ? insp.damages.length
        ? insp.damages.map((d, i) => `${i + 1}. ${d.kind}${d.note ? ` — ${d.note}` : ''}`).join('\n')
        : 'Nenhuma avaria encontrada ✅'
      : '',
    empresa: settings.businessName.split('&')[0].trim(),
  })
}

export function openWhatsApp(phone: string, text: string) {
  window.open(waLink(phone, text), '_blank', 'noopener')
}

/**
 * O link wa.me só abre a conversa com texto — não anexa arquivos. Quando o
 * navegador suporta compartilhar fotos (Web Share API, comum em celulares),
 * abrimos o menu nativo já com o texto + as fotos para o usuário escolher o
 * WhatsApp. Sem suporte (ou fotos), cai no fluxo de sempre (texto no wa.me).
 */
export async function sendInspection(phone: string, text: string, photos: string[] = []): Promise<'shared' | 'cancelled' | 'whatsapp'> {
  if (photos.length && typeof navigator.share === 'function') {
    try {
      const files = await Promise.all(
        photos.map(async (dataUrl, i) => {
          const blob = await (await fetch(dataUrl)).blob()
          return new File([blob], `vistoria-${i + 1}.jpg`, { type: blob.type || 'image/jpeg' })
        }),
      )
      if (!navigator.canShare || navigator.canShare({ files })) {
        await navigator.share({ text, files })
        return 'shared'
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return 'cancelled'
    }
  }
  openWhatsApp(phone, text)
  return 'whatsapp'
}
