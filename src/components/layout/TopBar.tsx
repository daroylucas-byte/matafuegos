import React from 'react'
import { useLocation } from 'react-router-dom'
import { Store } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useLocal } from '../../contexts/LocalContext'

export const TopBar: React.FC = () => {
  const { profile } = useAuth()
  const { activeLocalId, locales, setActiveLocalId } = useLocal()
  const location = useLocation()

  // Get title from current path
  const getPageTitle = () => {
    const path = location.pathname.split('/')[1]
    if (!path) return 'Dashboard'
    return path.charAt(0).toUpperCase() + path.slice(1)
  }

  return (
    <header className="h-16 border-b border-outline-variant bg-surface-container-lowest sticky top-0 z-20 px-6 flex items-center justify-between">
      <h1 className="text-headline-sm text-on-surface font-semibold ml-12 md:ml-0">
        {getPageTitle()}
      </h1>

      <div className="flex items-center gap-6">
        {/* Local Selector */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-container rounded-2xl border border-outline-variant">
          <Store className="h-4 w-4 text-primary" />
          <select 
            value={activeLocalId || ''}
            onChange={(e) => setActiveLocalId(e.target.value || null)}
            className="bg-transparent border-0 text-body-sm font-bold text-on-surface outline-none cursor-pointer pr-8"
          >
            {(profile?.rol?.toLowerCase() === 'superadmin' || profile?.rol?.toLowerCase() === 'admin') && (
              <option value="">Todos los locales</option>
            )}
            {locales.map(l => (
              <option key={l.id} value={l.id}>{l.nombre}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-4 border-l border-outline-variant pl-6">
          <div className="text-right hidden sm:block">
            <p className="text-body-md font-black text-on-surface leading-tight">
              {profile?.nombre || 'Cargando...'}
            </p>
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest">
              {profile?.rol || ''}
            </p>
          </div>
          <div className="h-10 w-10 rounded-2xl bg-primary-container flex items-center justify-center text-primary font-black border border-primary/20 shadow-sm transition-transform hover:scale-110">
            {profile?.nombre?.[0]?.toUpperCase() || '?'}
          </div>
        </div>
      </div>
    </header>
  )
}
