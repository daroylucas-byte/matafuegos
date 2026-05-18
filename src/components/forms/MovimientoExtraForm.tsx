import React, { useState, useEffect } from 'react'
import { X, Loader2, ArrowUpCircle, ArrowDownCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { MovimientoTipo, PagoMetodo } from '../../types'
import { Button } from '../ui/Button'

import { useLocal } from '../../contexts/LocalContext'

interface MovimientoExtraFormProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  cajaSessionId?: string
}

const CATEGORIAS_SUGERIDAS = ['Papelería', 'Limpieza', 'Servicios', 'Retiro parcial', 'Insumos', 'Otro']

export const MovimientoExtraForm: React.FC<MovimientoExtraFormProps> = ({ open, onClose, onSuccess, cajaSessionId }) => {
  const { activeLocalId } = useLocal()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [tipo, setTipo] = useState<MovimientoTipo>('egreso')
  const [metodo, setMetodo] = useState<PagoMetodo>('efectivo')
  const [categoria, setCategoria] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [monto, setMonto] = useState(0)
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [comprobante, setComprobante] = useState('')

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = 'unset' }
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeLocalId) {
      setError('Debe seleccionar una sucursal')
      return
    }
    if (!descripcion.trim() || monto <= 0) {
      setError('Complete descripción y monto correctamente')
      return
    }

    setLoading(true)
    try {
      // 1. Obtener sesión activa si no se pasó una (FILTRADO POR LOCAL)
      let currentSessionId = cajaSessionId
      if (!currentSessionId) {
        const { data: activeSesion } = await supabase
          .from('caja_sesiones')
          .select('id')
          .eq('local_id', activeLocalId)
          .is('cierre_at', null)
          .order('apertura_at', { ascending: false })
          .limit(1)
          .single()
        currentSessionId = activeSesion?.id
      }

      // 2. Insertar en tabla de auditoría de movimientos extra
      const { error: insertError } = await supabase
        .from('movimientos_extra')
        .insert([{
          tipo,
          categoria,
          descripcion,
          monto,
          fecha,
          local_id: activeLocalId,
          caja_sesion_id: currentSessionId,
          comprobante
        }])

      if (insertError) throw insertError

      // 3. Impacto real en CAJA
      if (currentSessionId) {
        await supabase.from('caja_movimientos').insert({
          caja_sesion_id: currentSessionId,
          local_id: activeLocalId,
          tipo,
          metodo,
          monto,
          descripcion: `${descripcion} (${categoria})`,
          pago_id: null
        })
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Error al registrar movimiento')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant">
          <h3 className="text-headline-sm font-bold text-on-surface">Movimiento Extraordinario</h3>
          <button onClick={onClose} className="p-2 hover:bg-surface-container rounded-full transition-colors"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && <div className="p-3 bg-error-container text-on-error-container rounded-lg text-body-sm">{error}</div>}

          {/* Tipo Selector */}
          <div className="flex p-1 bg-surface-container rounded-2xl border border-outline-variant">
            <button
              type="button"
              onClick={() => setTipo('ingreso')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${tipo === 'ingreso' ? 'bg-white text-secondary shadow-sm' : 'text-on-surface-variant'}`}
            >
              <ArrowUpCircle className="h-5 w-5" /> Ingreso
            </button>
            <button
              type="button"
              onClick={() => setTipo('egreso')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${tipo === 'egreso' ? 'bg-white text-error shadow-sm' : 'text-on-surface-variant'}`}
            >
              <ArrowDownCircle className="h-5 w-5" /> Egreso
            </button>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-label-sm font-bold text-on-surface-variant uppercase">Categoría</label>
              <input
                type="text"
                list="cats"
                className="w-full border border-outline-variant rounded-xl p-3 text-body-md"
                value={categoria}
                onChange={e => setCategoria(e.target.value)}
              />
              <datalist id="cats">
                {CATEGORIAS_SUGERIDAS.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>

            <div className="space-y-1">
              <label className="text-label-sm font-bold text-on-surface-variant uppercase">Método de Pago</label>
              <select
                className="w-full border border-outline-variant rounded-xl p-3 text-body-md bg-white"
                value={metodo}
                onChange={e => setMetodo(e.target.value as PagoMetodo)}
              >
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
                <option value="tarjeta_debito">Tarjeta de Débito</option>
                <option value="tarjeta_credito">Tarjeta de Crédito</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-label-sm font-bold text-on-surface-variant uppercase">Descripción *</label>
              <input
                type="text"
                required
                className="w-full border border-outline-variant rounded-xl p-3 text-body-md"
                value={descripcion}
                onChange={e => setDescripcion(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-label-sm font-bold text-on-surface-variant uppercase">Monto *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  className={`w-full border border-outline-variant rounded-xl p-3 text-body-lg font-bold text-right ${tipo === 'ingreso' ? 'text-secondary' : 'text-error'}`}
                  value={monto}
                  onChange={e => setMonto(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-label-sm font-bold text-on-surface-variant uppercase">Fecha</label>
                <input
                  type="date"
                  className="w-full border border-outline-variant rounded-xl p-3 text-body-md"
                  value={fecha}
                  onChange={e => setFecha(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-label-sm font-bold text-on-surface-variant uppercase">Nº Comprobante / Factura</label>
              <input
                type="text"
                className="w-full border border-outline-variant rounded-xl p-3 text-body-md"
                value={comprobante}
                onChange={e => setComprobante(e.target.value)}
              />
            </div>
          </div>
        </form>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-outline-variant bg-surface-container-low">
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading} className={`min-w-[120px] shadow-lg ${tipo === 'ingreso' ? 'shadow-secondary/20 bg-secondary hover:bg-secondary/90' : 'shadow-error/20 bg-error hover:bg-error/90'}`}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Registrar'}
          </Button>
        </div>
      </div>
    </div>
  )
}
