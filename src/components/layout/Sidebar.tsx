import React from 'react'
import { NavLink } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Users, 
  Truck,
  Receipt, 
  Wallet, 
  Package, 
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  UserCog,
  ShieldCheck,
  MessageSquare,
  DollarSign
} from 'lucide-react'
import { useLayout } from './LayoutContext'
import { useAuth } from '../../hooks/useAuth'
import { useConfig } from '../../contexts/ConfigContext'
import { cn } from '../../lib/utils'

export const Sidebar: React.FC = () => {
  const { isCollapsed, setIsCollapsed } = useLayout()
  const { profile, signOut } = useAuth()
  const { config } = useConfig()

  const toggleSidebar = () => setIsCollapsed(!isCollapsed)

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'vendedor', 'superadmin'], key: 'dashboard' },
    { name: 'Clientes', path: '/clientes', icon: Users, roles: ['admin', 'vendedor', 'superadmin'], key: 'clientes' },
    { name: 'Ventas', path: '/ventas', icon: Receipt, roles: ['admin', 'vendedor', 'superadmin'], key: 'ventas' },
    { name: 'Cobranzas', path: '/cobranzas', icon: DollarSign, roles: ['admin', 'vendedor', 'superadmin'], key: 'cobranzas' },
    { name: 'Proveedores', path: '/proveedores', icon: Truck, roles: ['admin', 'superadmin'], key: 'proveedores' },
    { name: 'Compras', path: '/compras', icon: ShoppingBag, roles: ['admin', 'superadmin'], key: 'compras' },
    { name: 'Caja', path: '/caja', icon: Wallet, roles: ['admin', 'vendedor', 'superadmin'], key: 'caja' },
    { name: 'Catálogo', path: '/productos', icon: Package, roles: ['admin', 'vendedor', 'superadmin'], key: 'catalogo' },
    { name: 'Usuarios', path: '/usuarios', icon: UserCog, roles: ['admin', 'superadmin'], key: 'usuarios' },
    { name: 'Chat', path: '/chat', icon: MessageSquare, roles: ['admin', 'vendedor', 'superadmin', 'cajero', 'visor'], key: 'chat' },
    { name: 'Configuración', path: '/configuracion', icon: Settings, roles: ['admin', 'superadmin'], key: 'configuracion' },
    { name: 'Super Admin', path: '/superadmin', icon: ShieldCheck, roles: ['superadmin'], key: 'superadmin' },
  ]

  const modulos = config?.servicios?.modulos || {}

  const filteredItems = navItems.filter(item => {
    // El Super Admin siempre ve su propia sección
    if (item.key === 'superadmin') return profile?.rol === 'superadmin'

    // Configuración siempre visible para admin/superadmin
    if (item.key === 'configuracion') {
      return profile?.rol === 'admin' || profile?.rol === 'superadmin'
    }

    // 1. Verificar rol primero
    const hasRole = !item.roles || (profile?.rol && item.roles.includes(profile.rol))
    if (!hasRole) return false

    // 2. Chat es opcional y viene deshabilitado por defecto (debe ser true)
    if (item.key === 'chat') {
      return modulos.chat === true
    }

    // 3. Para el resto de los módulos, se asume habilitado a menos que esté en false
    const estadoModulo = modulos[item.key as keyof typeof modulos]
    return estadoModulo !== false
  })

  return (
    <aside 
      className={cn(
        "h-full fixed left-0 top-0 bg-surface border-r border-outline-variant flex flex-col transition-all duration-300 z-50",
        isCollapsed ? "w-sidebar-collapsed" : "w-sidebar-width"
      )}
    >
      {/* Brand Logo Section */}
      <div className={cn(
        "px-6 py-8 flex items-center gap-3 transition-opacity duration-300",
        isCollapsed ? "opacity-0 invisible h-0 overflow-hidden" : "opacity-100"
      )}>
        {config?.logo_url ? (
          <img src={config.logo_url} alt="Logo" className="h-10 w-10 object-contain rounded-lg" />
        ) : (
          <div className="h-10 w-10 bg-primary-container rounded-lg flex items-center justify-center text-on-primary-container font-bold text-xl shrink-0">
            {config?.nombre_app?.charAt(0) || 'G'}
          </div>
        )}
        <div className="flex flex-col">
          <span className="font-headline-sm text-headline-sm font-bold text-primary truncate leading-tight">
            {config?.nombre_app || 'Gestión Pro'}
          </span>
          <span className="text-label-sm text-on-surface-variant font-medium">Administración</span>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 px-3 space-y-1 mt-4">
        {filteredItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              "flex items-center gap-4 px-4 py-3 rounded-xl transition-all active:scale-[0.98] group",
              isActive 
                ? "bg-surface-container-low text-primary border-l-4 border-primary shadow-sm" 
                : "text-on-surface-variant hover:bg-surface-container-high"
            )}
          >
            <item.icon className={cn(
              "h-5 w-5 shrink-0 transition-colors",
              "group-hover:text-primary"
            )} />
            {!isCollapsed && (
              <span className="font-body-md text-body-md font-medium">{item.name}</span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User / Footer Section */}
      <div className="mt-auto p-4">
        <div className={cn(
          "flex items-center gap-3 p-3 rounded-2xl bg-surface-container transition-all",
          isCollapsed ? "justify-center" : "px-4"
        )}>
          <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container shrink-0 shadow-sm">
            <span className="text-label-md font-bold">{profile?.nombre.charAt(0) || 'U'}</span>
          </div>
          {!isCollapsed && (
            <div className="flex flex-col overflow-hidden">
              <span className="text-label-md font-bold text-on-surface truncate">{profile?.nombre || 'Usuario'}</span>
              <button 
                onClick={signOut}
                className="text-label-sm text-on-surface-variant hover:text-error transition-colors text-left flex items-center gap-1 group"
              >
                <LogOut className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Toggle Button */}
      <button 
        onClick={toggleSidebar}
        className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white border border-outline-variant rounded-full flex items-center justify-center shadow-md hover:text-primary transition-colors active:scale-90"
      >
        {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>
    </aside>
  )
}
