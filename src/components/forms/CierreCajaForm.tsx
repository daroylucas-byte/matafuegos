import React, { useState, useEffect } from 'react'
import { X, Lock, AlertTriangle, Loader2, Wallet } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { cn, formatCurrency } from '../../lib/utils'
import { Button } from '../ui/Button'

interface CierreCajaFormProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  sesion: any
  stats: {
    ingresos: number
    egresos: number
  }
}

export const CierreCajaForm: React.FC<CierreCajaFormProps> = ({ open, onClose, onSuccess, sesion, stats }) => {
  const [loading, setLoading] = useState(false)
  const [montoReal, setMontoReal] = useState<number>(0)
  const [observaciones, setObservaciones] = useState('')
  const [confirmStep, setConfirmStep] = useState(false)

  // Saldo teórico = Apertura + Ingresos - Egresos
  const saldoTeorico = (sesion?.monto_apertura || 0) + stats.ingresos - stats.egresos
  const diferencia = montoReal - saldoTeorico

  useEffect(() => {
    if (open) {
      setMontoReal(saldoTeorico)
      setConfirmStep(false)
      setObservaciones('')
    }
  }, [open, saldoTeorico])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sesion) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('caja_sesiones')
        .update({
          cierre_at: new Date().toISOString(),
          monto_cierre_real: montoReal,
          monto_cierre_sistema: saldoTeorico,
          diferencia: diferencia,
          estado: 'cerrada',
          notas: observaciones
        })
        .eq('id', sesion.id)

      if (error) throw error
      
      onSuccess()
      onClose()
    } catch (err: any) {
      alert('Error al cerrar caja: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-outline-variant animate-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between px-8 py-6 border-b border-outline-variant bg-surface-container-low">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-error/10 text-error flex items-center justify-center">
              <Lock className="h-5 w-5" />
            </div>
            <h3 className="text-headline-small font-bold text-on-surface">Cierre de Caja</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-container rounded-full transition-colors"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-surface-container-lowest border border-outline-variant rounded-2xl">
              <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest mb-1">Saldo del Sistema</p>
              <p className="text-title-large font-bold text-on-surface">{formatCurrency(saldoTeorico)}</p>
            </div>
            <div className={cn(
              "p-4 border rounded-2xl",
              diferencia === 0 ? "bg-green-50 border-green-200" : 
              diferencia > 0 ? "bg-blue-50 border-blue-200" : "bg-red-50 border-red-200"
            )}>
              <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest mb-1">Diferencia</p>
              <p className={cn(
                "text-title-large font-bold",
                diferencia === 0 ? "text-green-700" : 
                diferencia > 0 ? "text-blue-700" : "text-red-700"
              )}>
                {diferencia > 0 ? '+' : ''}{formatCurrency(diferencia)}
              </p>
            </div>
          </div>

          {/* Real Amount Input */}
          <div className="space-y-2">
            <label className="text-label-large font-bold text-on-surface-variant ml-1">Efectivo Real en Caja (Conteo Físico)</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
                <Wallet className="h-6 w-6" />
              </div>
              <input
                type="number"
                step="any"
                autoFocus
                className="w-full pl-14 pr-6 py-5 bg-surface-container-lowest border-2 border-outline-variant rounded-3xl text-3xl font-black focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                value={montoReal}
                onChange={e => setMontoReal(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-label-large font-bold text-on-surface-variant ml-1">Observaciones / Notas de Cierre</label>
            <textarea
              className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-2xl text-body-md focus:ring-2 focus:ring-primary outline-none resize-none"
              rows={3}
              placeholder="Ej: Se retiró efectivo para depósito, o motivo de la diferencia..."
              value={observaciones}
              onChange={e => setObservaciones(e.target.value)}
            />
          </div>

          {/* Warning Message */}
          {Math.abs(diferencia) > 0 && (
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800">
              <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
              <div className="text-body-sm">
                <p className="font-bold">Atención: Hay una diferencia de arqueo.</p>
                <p className="opacity-90">Asegúrese de que todos los movimientos (gastos, retiros, ingresos) hayan sido registrados antes de cerrar.</p>
              </div>
            </div>
          )}

          {!confirmStep ? (
            <Button 
              type="button" 
              className="w-full h-14 rounded-2xl text-title-medium shadow-lg"
              onClick={() => setConfirmStep(true)}
            >
              Cerrar Sesión de Caja
            </Button>
          ) : (
            <div className="space-y-3 animate-in slide-in-from-bottom-4 duration-300">
              <p className="text-center text-body-sm text-error font-bold">¿Está seguro? Una vez cerrada, no podrá agregar más movimientos a esta sesión.</p>
              <div className="flex gap-3">
                <Button variant="ghost" className="flex-1" onClick={() => setConfirmStep(false)}>Cancelar</Button>
                <Button 
                  type="submit" 
                  className="flex-1 bg-error hover:bg-error/90 h-12 shadow-xl shadow-error/20 gap-2"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Lock className="h-5 w-5" />}
                  Confirmar Cierre
                </Button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
