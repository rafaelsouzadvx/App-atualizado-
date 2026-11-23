import { useSyncExternalStore } from 'react'

export type Route =
  | 'dashboard'
  | 'clientes'
  | 'veiculos'
  | 'agenda'
  | 'servicos'
  | 'os'
  | 'financeiro'
  | 'whatsapp'
  | 'vistoria'
  | 'relatorios'
  | 'estoque'
  | 'config'

const ROUTES: Route[] = ['dashboard', 'clientes', 'veiculos', 'agenda', 'servicos', 'os', 'financeiro', 'whatsapp', 'vistoria', 'relatorios', 'estoque', 'config']

const read = (): Route => {
  const h = location.hash.replace(/^#\/?/, '').split('?')[0] as Route
  return ROUTES.includes(h) ? h : 'dashboard'
}

const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}

export const useRoute = () => useSyncExternalStore(subscribe, read, read)

export const navigate = (r: Route) => {
  const target = r === 'dashboard' ? '#/' : `#/${r}`
  if (location.hash !== target) location.hash = target
  window.scrollTo({ top: 0 })
}
