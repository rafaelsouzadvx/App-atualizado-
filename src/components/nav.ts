import {
  BarChart3,
  CalendarDays,
  Car,
  CircleDollarSign,
  ClipboardCheck,
  FileText,
  Home,
  MessageCircle,
  Package,
  Settings,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import type { Route } from '../lib/router'

export const NAV: { route: Route; label: string; icon: LucideIcon; short?: string }[] = [
  { route: 'dashboard', label: 'Dashboard', icon: Home, short: 'Início' },
  { route: 'clientes', label: 'Clientes', icon: Users },
  { route: 'veiculos', label: 'Veículos', icon: Car },
  { route: 'agenda', label: 'Agenda', icon: CalendarDays },
  { route: 'servicos', label: 'Serviços', icon: Wrench },
  { route: 'os', label: 'Orçamentos / OS', icon: FileText, short: 'OS' },
  { route: 'financeiro', label: 'Financeiro', icon: CircleDollarSign },
  { route: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { route: 'vistoria', label: 'Vistoria', icon: ClipboardCheck },
  { route: 'relatorios', label: 'Relatórios', icon: BarChart3 },
  { route: 'estoque', label: 'Estoque', icon: Package },
  { route: 'config', label: 'Configurações', icon: Settings },
]
