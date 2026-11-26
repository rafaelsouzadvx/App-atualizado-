import { useEffect, useRef, useState } from 'react'
import { Building2, Download, Eraser, RotateCcw, Save, Smartphone, Target, Upload } from 'lucide-react'
import { Button, Card, Field, Input, PageHeader } from '../components/ui'
import { Logo } from '../components/Logo'
import type { DB, Settings } from '../lib/types'
import { downloadFile, maskPhone, money, todayISO } from '../lib/utils'
import { useDB } from '../store/data'
import { confirmDialog, toast } from '../store/ui'

interface BIPEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: string }>
}
let deferred: BIPEvent | null = null
if (typeof window !== 'undefined')
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as BIPEvent
  })

export default function Config() {
  const settings = useDB((s) => s.settings)
  const updateSettings = useDB((s) => s.updateSettings)
  const resetDemo = useDB((s) => s.resetDemo)
  const clearAll = useDB((s) => s.clearAll)
  const [f, setF] = useState<Settings>(settings)
  const [goal, setGoal] = useState(String(settings.monthlyGoal))
  const fileRef = useRef<HTMLInputElement>(null)
  const [canInstall, setCanInstall] = useState(!!deferred)
  const standalone = typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches

  useEffect(() => setF(settings), [settings])
  useEffect(() => {
    const h = () => setCanInstall(true)
    window.addEventListener('beforeinstallprompt', h)
    return () => window.removeEventListener('beforeinstallprompt', h)
  }, [])

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setF((s) => ({ ...s, [k]: v }))
  const dirty = JSON.stringify(f) !== JSON.stringify(settings) || Number(goal) !== settings.monthlyGoal

  const save = () => {
    if (!f.businessName.trim() || !f.ownerName.trim()) return toast('Informe o nome da empresa e do responsável', 'error')
    updateSettings({ ...f, monthlyGoal: Math.max(0, Number(goal.replace(/\D/g, '')) || 0) })
    toast('Configurações salvas')
  }

  const backup = () => {
    const s = useDB.getState()
    const data: DB = { clients: s.clients, vehicles: s.vehicles, services: s.services, orders: s.orders, quotes: s.quotes, transactions: s.transactions, products: s.products, inspections: s.inspections, settings: s.settings }
    downloadFile(`backup-jatwash-${todayISO()}.json`, JSON.stringify(data), 'application/json')
    toast('Backup baixado')
  }
  const restore = async (file?: File) => {
    if (!file) return
    try {
      const data = JSON.parse(await file.text()) as DB
      if (!Array.isArray(data.clients) || !Array.isArray(data.orders)) throw new Error()
      if (!(await confirmDialog({ title: 'Restaurar backup?', message: 'Os dados atuais serão substituídos pelos do arquivo.', confirmLabel: 'Restaurar' }))) return
      useDB.setState({ ...data, anchor: undefined })
      toast('Backup restaurado')
    } catch {
      toast('Arquivo de backup inválido', 'error')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div>
      <PageHeader title="Configurações" subtitle="Dados do negócio, metas e backup" />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-4">
          <Card
            title={
              <span className="flex items-center gap-2">
                <Building2 size={18} className="text-gold-400" /> Dados da empresa
              </span>
            }
          >
            <div className="grid gap-3.5 sm:grid-cols-2">
              <Field label="Nome da empresa" className="sm:col-span-2">
                <Input value={f.businessName} onChange={(e) => set('businessName', e.target.value)} />
              </Field>
              <Field label="Responsável">
                <Input value={f.ownerName} onChange={(e) => set('ownerName', e.target.value)} />
              </Field>
              <Field label="WhatsApp da empresa">
                <Input inputMode="tel" value={f.phone} onChange={(e) => set('phone', maskPhone(e.target.value))} />
              </Field>
              <Field label="Endereço" className="sm:col-span-2">
                <Input value={f.address} onChange={(e) => set('address', e.target.value)} />
              </Field>
              <Field label="Abre às">
                <Input type="time" value={f.openTime} onChange={(e) => set('openTime', e.target.value)} />
              </Field>
              <Field label="Fecha às">
                <Input type="time" value={f.closeTime} onChange={(e) => set('closeTime', e.target.value)} />
              </Field>
            </div>
          </Card>
          <Card
            title={
              <span className="flex items-center gap-2">
                <Target size={18} className="text-gold-400" /> Meta de faturamento mensal
              </span>
            }
          >
            <Field label="Meta (R$)">
              <Input inputMode="numeric" value={goal} onChange={(e) => setGoal(e.target.value.replace(/\D/g, ''))} className="font-display !text-xl" />
            </Field>
            <div className="mt-3 flex flex-wrap gap-2">
              {[20000, 30000, 40000, 50000].map((v) => (
                <button key={v} onClick={() => setGoal(String(v))} className="h-9 rounded-full border border-line-2 px-3 text-[13px] text-muted hover:border-gold-500 hover:text-fg">
                  {money(v)}
                </button>
              ))}
            </div>
          </Card>
          <div className={dirty ? 'sticky bottom-20 z-20 lg:bottom-4' : ''}>
            <Button variant="primary" size="lg" icon={Save} className="w-full" disabled={!dirty} onClick={save}>
              {dirty ? 'Salvar alterações' : 'Tudo salvo'}
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <Card title="Aplicativo">
            <div className="flex flex-col items-center py-2">
              <Logo />
              <p className="mt-3 text-xs text-subtle">Versão 1.0 · modo demonstração</p>
            </div>
            <div className="mt-4 rounded-2xl border border-line bg-ink/40 p-4">
              <p className="flex items-center gap-2 font-medium">
                <Smartphone size={18} className="text-gold-400" /> Instalar no celular
              </p>
              {standalone ? (
                <p className="mt-1 text-sm text-green-400">✓ App já instalado neste aparelho.</p>
              ) : canInstall ? (
                <Button
                  variant="primary"
                  className="mt-3 w-full"
                  onClick={async () => {
                    await deferred?.prompt()
                    deferred = null
                    setCanInstall(false)
                  }}
                >
                  Instalar aplicativo
                </Button>
              ) : (
                <p className="mt-1 text-sm text-muted">
                  No <b className="text-fg">iPhone</b>: toque em Compartilhar → “Adicionar à Tela de Início”.
                  <br />
                  No <b className="text-fg">Android</b>: menu ⋮ do Chrome → “Instalar app”.
                </p>
              )}
            </div>
          </Card>
          <Card title="Backup dos dados">
            <p className="mb-3 text-sm text-muted">Os dados ficam salvos neste aparelho. Faça backup para não perder nada.</p>
            <div className="grid grid-cols-2 gap-2">
              <Button icon={Download} onClick={backup}>
                Baixar
              </Button>
              <Button icon={Upload} onClick={() => fileRef.current?.click()}>
                Restaurar
              </Button>
            </div>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => restore(e.target.files?.[0])} />
          </Card>
          <Card title="Demonstração">
            <div className="space-y-2">
              <Button
                icon={RotateCcw}
                className="w-full"
                onClick={async () => {
                  if (await confirmDialog({ title: 'Restaurar dados de exemplo?', message: 'Tudo o que foi alterado será substituído pelos dados de demonstração.', confirmLabel: 'Restaurar' })) {
                    resetDemo()
                    toast('Dados de demonstração restaurados')
                  }
                }}
              >
                Restaurar dados de exemplo
              </Button>
              <Button
                variant="danger"
                icon={Eraser}
                className="w-full"
                onClick={async () => {
                  if (await confirmDialog({ title: 'Começar do zero?', message: 'Clientes, veículos, OS, financeiro, estoque e vistorias serão apagados. Serviços e configurações são mantidos.', confirmLabel: 'Apagar tudo', danger: true })) {
                    clearAll()
                    toast('Sistema zerado — pronto para uso real', 'info')
                  }
                }}
              >
                Apagar dados e começar do zero
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
