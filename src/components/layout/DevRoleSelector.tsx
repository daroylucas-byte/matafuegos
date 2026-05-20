import React, { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { Shield, RefreshCw } from 'lucide-react'
import { toast } from 'react-hot-toast'
import type { UserRol } from '../../types'

export const DevRoleSelector: React.FC = () => {
  const { user, rol } = useAuth()
  const [updating, setUpdating] = useState(false)

  if (!user) return null

  const roles: { value: UserRol; label: string }[] = [
    { value: 'superadmin', label: '🛡️ Super Admin' },
    { value: 'admin', label: '💼 Admin' },
    { value: 'vendedor', label: '🏷️ Vendedor' },
    { value: 'cajero', label: '💵 Cajero' },
    { value: 'visor', label: '👁️ Visor' }
  ]

  const currentRole = (localStorage.getItem('dev_role_override') as UserRol) || rol || 'visor'

  const handleRoleChange = async (newRole: UserRol) => {
    try {
      setUpdating(true)
      
      // 1. Update localStorage override
      localStorage.setItem('dev_role_override', newRole)
      
      // 2. Update real database profile (to sync backend RLS policies)
      const { error } = await supabase
        .from('profiles')
        .update({ rol: newRole })
        .eq('id', user.id)

      if (error) {
        console.error('Error actualizando perfil:', error)
      }

      // 3. Refresh session claims in Supabase auth
      await supabase.auth.refreshSession()

      toast.success(`Rol cambiado a: ${newRole.toUpperCase()}! Recargando...`)
      
      // 4. Reload page to trigger router updates
      setTimeout(() => {
        window.location.reload()
      }, 800)

    } catch (err: any) {
      console.error(err)
      toast.error('Error al cambiar rol: ' + err.message)
    } finally {
      setUpdating(false)
    }
  }

  const handleClearOverride = () => {
    localStorage.removeItem('dev_role_override')
    toast.success('Filtro de rol removido! Restaurando rol real...')
    setTimeout(() => {
      window.location.reload()
    }, 800)
  }

  return (
    <div className="fixed bottom-4 right-4 z-[9999] bg-white/95 border border-slate-200 p-2.5 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-center gap-1.5 text-slate-700 text-xs font-bold">
        <Shield className="h-4 w-4 text-primary animate-pulse" />
        <span className="hidden sm:inline">Modo Dev (Rol):</span>
      </div>
      
      <select
        value={currentRole}
        onChange={(e) => handleRoleChange(e.target.value as UserRol)}
        disabled={updating}
        className="text-xs font-bold bg-slate-100 border border-slate-200 rounded-xl px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-primary text-slate-800 disabled:opacity-55 cursor-pointer"
      >
        {roles.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>

      {localStorage.getItem('dev_role_override') && (
        <button
          onClick={handleClearOverride}
          title="Restablecer rol original"
          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      )}

      {updating && (
        <div className="absolute inset-0 bg-white/80 rounded-2xl flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  )
}
