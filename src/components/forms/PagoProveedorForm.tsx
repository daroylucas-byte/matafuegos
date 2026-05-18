import React, { useState, useEffect } from 'react'
import { 
  X, 
  Wallet, 
  Loader2,
  CheckCircle2
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { cn, formatCurrency } from '../../lib/utils'
import { Button } from '../ui/Button'
import type { Proveedor } from '../../types'

interface PagoProveedorFormProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  proveedorPreseleccionado?: Proveedor
  compraId?: string
}

export const PagoProveedorForm: React.FC<PagoProveedorFormProps> = ({ 
  open,
  onClose, 
  onSuccess, 
  proveedorPreseleccionado,
  compraId 
}) => {
  const [loading, setLoading] = useState(false)
  const [balanceProv, setBalanceProv] = useState<number | null>(null)
  const [balanceCompra, setBalanceCompra] = useState<number | null>(null)
  const [monto, setMonto] = useState<number>(0)
  const [metodo, setMetodo] = useState<'efectivo' | 'transferencia' | 'tarjeta_debito' | 'tarjeta_credito' | 'cheque'>('efectivo')
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [referencia, setReferencia] = useState('')
  const [notas, setNotas] = useState('')

  useEffect(() => {
    if (open && proveedorPreseleccionado) {
      loadBalances()
    }
  }, [open, proveedorPreseleccionado, compraId])

  const loadBalances = async () => {
    try {
      // Saldo total del proveedor (global)
      const { data: provData } = await supabase
        .from('vista_resumen_proveedores')
        .select('saldo_deudor')
        .eq('id', proveedorPreseleccionado?.id)
        .single()
      
      if (provData) setBalanceProv(provData.saldo_deudor)

      // Saldo de la compra específica si existe
      if (compraId) {
        const { data: compraData } = await supabase
          .from('compras')
          .select('saldo_pendiente')
          .eq('id', compraId)
          .single()
        
        if (compraData) {
          setBalanceCompra(compraData.saldo_pendiente)
          setMonto(compraData.saldo_pendiente) // Pre-cargar el monto de la compra
        }
      }
    } catch (err) {
      console.error('Error cargando balances:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!proveedorPreseleccionado || monto <= 0) return

    setLoading(true)
    try {
      // 1. Obtener sesión de caja abierta si existe
      const { data: sesion } = await supabase
        .from('caja_sesiones')
        .select('id')
        .eq('estado', 'abierta')
        .single()

      // 2. Registrar el Pago (Los triggers de la DB se encargan de la imputación FIFO)
      const { data: pago, error: pagoError } = await supabase
        .from('pagos_proveedores')
        .insert({
          proveedor_id: proveedorPreseleccionado.id,
          caja_sesion_id: sesion?.id,
          monto,
          metodo,
          fecha,
          referencia,
          notas,
          compra_prioritaria_id: compraId // Priorizar esta compra si el pago se inicia desde su detalle
        })
        .select()
        .single()

      if (pagoError) throw pagoError

      // 3. Verificar que el trigger FIFO creó al menos una imputación
      const { count } = await supabase
        .from('pago_proveedor_imputaciones')
        .select('*', { count: 'exact', head: true })
        .eq('pago_id', pago.id)

      if ((count ?? 0) === 0) {
        // El pago quedó como crédito a favor (no había compras pendientes)
        console.warn('Pago registrado sin imputar — el proveedor queda con saldo a favor')
      }

      // 4. Registrar movimiento de egreso en caja si hay sesión
      if (sesion) {
        await supabase.from('caja_movimientos').insert({
          caja_sesion_id: sesion.id,
          tipo: 'egreso',
          metodo,
          monto,
          descripcion: `Pago a proveedor: ${proveedorPreseleccionado.razon_social}`,
          pago_proveedor_id: pago.id
        })
      }

      onSuccess()
    } catch (error: any) {
      alert('Error al registrar el pago: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-outline-variant animate-in zoom-in-95 duration-200">
        <div className="px-6 py-5 border-b border-outline-variant flex items-center justify-between bg-surface-container-low">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center text-on-primary-container shadow-sm">
              <Wallet className="h-5 w-5" />
            </div>
            <h2 className="text-headline-small font-bold">Registrar Pago</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-container-highest rounded-full transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {(balanceProv !== null || balanceCompra !== null) && (
            <div className="grid grid-cols-2 gap-3 mb-2">
              {balanceProv !== null && (
                <div className="bg-surface-container-high/50 p-3 rounded-2xl border border-outline-variant">
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block mb-1">
                    {balanceProv > 0 ? 'Deuda Total' : balanceProv < 0 ? 'Saldo a Favor' : 'Sin Deuda'}
                  </span>
                  <span className={cn(
                    "text-title-medium font-black",
                    balanceProv > 0 ? "text-error" : balanceProv < 0 ? "text-secondary" : "text-on-surface-variant"
                  )}>
                    {formatCurrency(Math.abs(balanceProv))}
                  </span>
                </div>
              )}
              {balanceCompra !== null && (
                <div className="bg-primary/5 p-3 rounded-2xl border border-primary/20">
                  <span className="text-[10px] font-bold text-primary uppercase tracking-widest block mb-1">Esta Compra</span>
                  <span className="text-title-medium font-black text-primary">{formatCurrency(balanceCompra)}</span>
                </div>
              )}
            </div>
          )}

          <div className="bg-primary-container/20 p-4 rounded-2xl flex flex-col items-center gap-1">
            <span className="text-label-small font-bold text-primary uppercase tracking-wider">Monto a Pagar</span>
            <input
              type="number"
              step="any"
              autoFocus
              value={monto || ''}
              onChange={e => setMonto(parseFloat(e.target.value) || 0)}
              className="text-4xl font-black text-on-surface text-center bg-transparent border-none focus:ring-0 w-full"
              placeholder="0.00"
            />
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-label-small font-bold text-on-surface-variant uppercase ml-1">Método</label>
                <select
                  value={metodo}
                  onChange={e => setMetodo(e.target.value as any)}
                  className="w-full px-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="tarjeta_debito">Tarjeta Débito</option>
                  <option value="tarjeta_credito">Tarjeta Crédito</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-label-small font-bold text-on-surface-variant uppercase ml-1">Fecha</label>
                <input
                  type="date"
                  value={fecha}
                  onChange={e => setFecha(e.target.value)}
                  className="w-full px-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-label-small font-bold text-on-surface-variant uppercase ml-1">Referencia / Comprobante</label>
              <input
                type="text"
                value={referencia}
                onChange={e => setReferencia(e.target.value)}
                placeholder="Ej: CBU, Nº Cheque, etc."
                className="w-full px-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-label-small font-bold text-on-surface-variant uppercase ml-1">Notas</label>
              <textarea
                value={notas}
                onChange={e => setNotas(e.target.value)}
                placeholder="Notas adicionales sobre el pago..."
                rows={2}
                className="w-full px-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all resize-none"
              />
            </div>
          </div>

          <div className="pt-2">
            <Button 
              type="submit" 
              disabled={loading || monto <= 0} 
              className="w-full rounded-2xl h-14 shadow-lg gap-2 text-title-medium"
            >
              {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <CheckCircle2 className="h-6 w-6" />}
              Confirmar Pago
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
