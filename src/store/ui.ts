import { create } from 'zustand'
import type { ID } from '../lib/types'

export type FormKind = 'client' | 'vehicle' | 'order' | 'quote' | 'transaction' | 'product' | 'service' | 'inspection'

export interface FormState {
  kind: FormKind
  id?: ID
  preset?: Record<string, unknown>
}

interface Toast {
  id: number
  message: string
  tone: 'success' | 'error' | 'info'
}

interface ConfirmState {
  title: string
  message?: string
  confirmLabel?: string
  danger?: boolean
  resolve: (ok: boolean) => void
}

interface UI {
  form: FormState | null
  stack: FormState[]
  openForm: (f: FormState) => void
  closeForm: () => void
  toasts: Toast[]
  toast: (message: string, tone?: Toast['tone']) => void
  dismiss: (id: number) => void
  confirmState: ConfirmState | null
  confirm: (c: Omit<ConfirmState, 'resolve'>) => Promise<boolean>
  closeConfirm: (ok: boolean) => void
  quickOpen: boolean
  setQuickOpen: (v: boolean) => void
  moreOpen: boolean
  setMoreOpen: (v: boolean) => void
  searchOpen: boolean
  setSearchOpen: (v: boolean) => void
  saleOpen: boolean
  setSaleOpen: (v: boolean) => void
  detail: { kind: 'order' | 'client'; id: ID } | null
  openDetail: (d: UI['detail']) => void
}

let tid = 0

export const useUI = create<UI>()((set, get) => ({
  form: null,
  stack: [],
  // formulários podem ser empilhados (ex.: criar cliente de dentro da OS)
  openForm: (f) => set((s) => ({ stack: s.form ? [...s.stack, s.form] : s.stack, form: f, quickOpen: false, moreOpen: false })),
  closeForm: () => set((s) => ({ form: s.stack[s.stack.length - 1] ?? null, stack: s.stack.slice(0, -1) })),

  toasts: [],
  toast: (message, tone = 'success') => {
    const id = ++tid
    set((s) => ({ toasts: [...s.toasts.slice(-1), { id, message, tone }] }))
    setTimeout(() => get().dismiss(id), 2600)
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  confirmState: null,
  confirm: (c) => new Promise<boolean>((resolve) => set({ confirmState: { ...c, resolve } })),
  closeConfirm: (ok) => {
    get().confirmState?.resolve(ok)
    set({ confirmState: null })
  },

  quickOpen: false,
  setQuickOpen: (v) => set({ quickOpen: v }),
  moreOpen: false,
  setMoreOpen: (v) => set({ moreOpen: v }),
  searchOpen: false,
  setSearchOpen: (v) => set({ searchOpen: v }),
  saleOpen: false,
  setSaleOpen: (v) => set({ saleOpen: v, quickOpen: false, moreOpen: false }),
  detail: null,
  openDetail: (d) => set({ detail: d }),
}))

export const toast = (m: string, t?: Toast['tone']) => useUI.getState().toast(m, t)
export const confirmDialog = (c: Omit<ConfirmState, 'resolve'>) => useUI.getState().confirm(c)
export const openForm = (f: FormState) => useUI.getState().openForm(f)
