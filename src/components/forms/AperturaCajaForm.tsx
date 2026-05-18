import React, { useState } from 'react'
import { X, Play, Wallet, Loader2, CheckCircle2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Button } from '../ui/Button'

import { useLocal } from '../../contexts/LocalContext'

interface AperturaCajaFormProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export const AperturaCajaForm: React.FC<AperturaCajaFormProps> = ({ open, onClose, onSuccess }) => {
  const { activeLocalId } = useLocal()
  const [loading, setLoading] = useState(false)
  const [montoApertura, setMontoApertura] = useState<number>(0)
  const [notas, setNotas] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeLocalId) {
      alert('Debe seleccionar una sucursal para abrir la caja')
      return
    }
    setLoading(true)

    try {
      // Obtener el ID del usuario actual
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No se encontró usuario autenticado')

      const { error } = await supabase
        .from('caja_sesiones')
        .insert({
          cajero_id: user.id,
          local_id: activeLocalId,
          monto_apertura: montoApertura,
          estado: 'abierta',
          notas: notas
        })

      if (error) throw error
      
      onSuccess()
      onClose()
    } catch (err: any) {
      alert('Error al abrir caja: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-outline-variant animate-in zoom-in-95 duration-300">
        <div className="px-8 py-6 border-b border-outline-variant bg-primary-container/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <Play className="h-5 w-5 ml-0.5" />
              </div>
              <h3 className="text-headline-small font-bold text-on-surface">Abrir Caja</h3>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-surface-container rounded-full transition-colors"><X className="h-5 w-5" /></button>
          </div>
          <p className="text-on-surface-variant text-body-sm mt-2">Inicie una nueva sesión de caja para hoy.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-label-large font-bold text-on-surface-variant ml-1">Monto Inicial (Efectivo en Caja)</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
                <Wallet className="h-6 w-6" />
              </div>
              <input
                type="number"
                step="any"
                autoFocus
                required
                className="w-full pl-14 pr-6 py-5 bg-surface-container-lowest border-2 border-outline-variant rounded-3xl text-3xl font-black focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                value={montoApertura}
                onChange={e => setMontoApertura(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-label-large font-bold text-on-surface-variant ml-1">Notas de Apertura</label>
            <textarea
              className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-2xl text-body-md focus:ring-2 focus:ring-primary outline-none resize-none"
              rows={2}
              placeholder="Opcional: Detalle de billetes o comentarios..."
              value={notas}
              onChange={e => setNotas(e.target.value)}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full h-14 rounded-2xl text-title-medium shadow-lg shadow-primary/20 gap-2"
            disabled={loading}
          >
            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <CheckCircle2 className="h-6 w-6" />}
            Iniciar Turno
          </Button>
        </form>
      </div>
    </div>
  )
}
