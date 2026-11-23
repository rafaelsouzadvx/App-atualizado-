import { lazy, Suspense, useEffect } from 'react'
import { Shell } from './components/Layout'
import { FormHost } from './components/forms'
import { DetailHost } from './components/Details'
import { useRoute, type Route } from './lib/router'
import Dashboard from './pages/Dashboard'

// páginas secundárias carregam sob demanda → primeira abertura mais rápida no celular
const pages: Record<Exclude<Route, 'dashboard'>, React.LazyExoticComponent<() => React.JSX.Element>> = {
  clientes: lazy(() => import('./pages/Clientes')),
  veiculos: lazy(() => import('./pages/Veiculos')),
  agenda: lazy(() => import('./pages/Agenda')),
  servicos: lazy(() => import('./pages/Servicos')),
  os: lazy(() => import('./pages/OS')),
  financeiro: lazy(() => import('./pages/Financeiro')),
  whatsapp: lazy(() => import('./pages/WhatsApp')),
  vistoria: lazy(() => import('./pages/Vistoria')),
  relatorios: lazy(() => import('./pages/Relatorios')),
  estoque: lazy(() => import('./pages/Estoque')),
  config: lazy(() => import('./pages/Config')),
}

const TITLES: Record<Route, string> = {
  dashboard: 'Dashboard',
  clientes: 'Clientes',
  veiculos: 'Veículos',
  agenda: 'Agenda',
  servicos: 'Serviços',
  os: 'Orçamentos / OS',
  financeiro: 'Financeiro',
  whatsapp: 'WhatsApp',
  vistoria: 'Vistoria',
  relatorios: 'Relatórios',
  estoque: 'Estoque',
  config: 'Configurações',
}

function Loading() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-surface-2" />
      <div className="h-40 animate-pulse rounded-2xl bg-surface" />
      <div className="h-64 animate-pulse rounded-2xl bg-surface" />
    </div>
  )
}

export default function App() {
  const route = useRoute()
  useEffect(() => {
    document.title = `${TITLES[route]} · Rafael Estética`
  }, [route])
  const Page = route === 'dashboard' ? Dashboard : pages[route]
  return (
    <Shell>
      <Suspense fallback={<Loading />}>
        <div key={route} className="animate-fade-in">
          <Page />
        </div>
      </Suspense>
      <DetailHost />
      <FormHost />
    </Shell>
  )
}
