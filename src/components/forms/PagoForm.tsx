import React, { useState, useEffect } from 'react'
import { X, Loader2, Search, Wallet } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Cliente, Venta, PagoMetodo } from '../../types'
import { Button } from '../ui/Button'
import { formatCurrency, formatDate } from '../../lib/utils'
import { useLocal } from '../../contexts/LocalContext'

interface PagoFormProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  clientePreseleccionado?: Cliente
}

const METODOS_PAGO: { value: PagoMetodo, label: string }[] = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'tarjeta_debito', label: 'Tarjeta de Débito' },
  { value: 'tarjeta_credito', label: 'Tarjeta de Crédito' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'credito_cliente', label: 'Crédito de Cliente' }
]

export const PagoForm: React.FC<PagoFormProps> = ({ open, onClose, onSuccess, clientePreseleccionado }) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { activeLocalId } = useLocal()
  
  const [cliente, setCliente] = useState<Cliente | null>(clientePreseleccionado || null)
  const [ventasPendientes, setVentasPendientes] = useState<Venta[]>([])
  const [searchCliente, setSearchCliente] = useState('')
  const [clientesSugeridos, setClientesSugeridos] = useState<Cliente[]>([])
  const [showClientes, setShowClientes] = useState(false)

  const [monto, setMonto] = useState(0)
  const [metodo, setMetodo] = useState<PagoMetodo>('efectivo')
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [referencia, setReferencia] = useState('')
  const [notas, setNotas] = useState('')

  // Debounced Client Search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchCliente.trim().length < 2) return
      const { data } = await supabase
        .from('clientes')
        .select('*')
        .ilike('razon_social', `%${searchCliente}%`)
        .limit(5)
      setClientesSugeridos(data || [])
    }, 300)
    return () => clearTimeout(timer)
  }, [searchCliente])

  // Load Unpaid Sales when client is selected
  useEffect(() => {
    const loadVentas = async () => {
      if (!cliente?.id) {
        setVentasPendientes([])
        return
      }
      const { data } = await supabase
        .from('ventas')
        .select('*')
        .eq('cliente_id', cliente.id)
        .neq('estado', 'cancelado') // Asegurar que no traemos canceladas
        .gt('saldo_pendiente', 0)
        .order('fecha', { ascending: true })
      setVentasPendientes(data || [])
      
      // Sugerir monto total de deuda
      const totalDeuda = (data || []).reduce((acc, v) => acc + v.saldo_pendiente, 0)
      setMonto(totalDeuda)
    }
    loadVentas()
  }, [cliente])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cliente) return
    if (monto <= 0) {
      setError('El monto debe ser mayor a cero')
      return
    }
    
    if (!activeLocalId) {
      setError('Debes seleccionar un local para registrar el pago')
      return
    }

    setLoading(true)
    setError(null)
    try {
      // 1. Registrar el Pago
      const { data: pago, error: pagoError } = await supabase
        .from('pagos')
        .insert([{
          cliente_id: cliente.id,
          metodo,
          monto,
          fecha,
          referencia,
          notas,
          local_id: activeLocalId
        }])
        .select()
        .single()

      if (pagoError) throw pagoError

      // 2. Conciliar con ventas pendientes (FIFO)
      let montoRestante = monto
      const updates = []

      for (const venta of ventasPendientes) {
        if (montoRestante <= 0) break

        const pagoParaEstaVenta = Math.min(venta.saldo_pendiente, montoRestante)
        const nuevoSaldo = venta.saldo_pendiente - pagoParaEstaVenta
        montoRestante -= pagoParaEstaVenta

        updates.push(
          supabase
            .from('ventas')
            .update({ 
              saldo_pendiente: nuevoSaldo,
              estado: nuevoSaldo === 0 ? 'cobrado' : venta.estado
            })
            .eq('id', venta.id)
        )
      }

      // Ejecutar todas las actualizaciones de saldo
      if (updates.length > 0) {
        const results = await Promise.all(updates)
        const firstError = results.find(r => r.error)
        if (firstError) throw firstError.error
      }

      // 3. Impacto en Caja
      const { data: sesion } = await supabase
        .from('caja_sesiones')
        .select('id')
        .eq('local_id', activeLocalId)
        .is('cierre_at', null)
        .order('apertura_at', { ascending: false })
        .limit(1)
        .single()

      if (sesion) {
        await supabase.from('caja_movimientos').insert({
          caja_sesion_id: sesion.id,
          tipo: 'ingreso',
          metodo,
          monto,
          descripcion: `Cobro a cliente: ${cliente.razon_social}`,
          pago_id: pago.id,
          local_id: activeLocalId
        })
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('Error en proceso de cobro:', err)
      setError(err.message || 'Error al registrar el pago y actualizar saldos')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant">
          <h3 className="text-headline-sm font-bold text-on-surface flex items-center gap-2">
            <Wallet className="h-6 w-6 text-primary" /> Registrar Pago de Cliente
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-surface-container rounded-full"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && <div className="p-3 bg-error-container text-on-error-container rounded-lg">{error}</div>}

          {/* Cliente Selection */}
          <div className="space-y-1 relative">
            <label className="text-label-sm font-bold text-on-surface-variant uppercase tracking-wider">Cliente</label>
            {cliente ? (
              <div className="flex items-center justify-between p-4 bg-primary/5 border border-primary/20 rounded-xl shadow-sm">
                <div>
                  <p className="font-bold text-body-lg text-primary">{cliente.razon_social}</p>
                  <p className="text-xs text-on-surface-variant uppercase tracking-widest">CUIT: {cliente.cuit || '—'}</p>
                </div>
                {!clientePreseleccionado && (
                  <button onClick={() => setCliente(null)} className="text-on-surface-variant hover:text-error">
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-outline" />
                  <input
                    type="text"
                    placeholder="Buscar cliente para cobrar..."
                    className="w-full pl-10 pr-4 py-3 border border-outline-variant rounded-xl text-body-md focus:ring-2 focus:ring-primary"
                    value={searchCliente}
                    onChange={e => { setSearchCliente(e.target.value); setShowClientes(true); }}
                  />
                </div>
                {showClientes && clientesSugeridos.length > 0 && (
                  <div className="absolute top-full left-0 w-full bg-white border border-outline-variant rounded-xl shadow-xl mt-1 z-10">
                    {clientesSugeridos.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        className="w-full px-4 py-3 text-left hover:bg-surface-container-low border-b border-outline-variant last:border-0"
                        onClick={() => { setCliente(c); setShowClientes(false); }}
                      >
                        <p className="font-bold text-body-md">{c.razon_social}</p>
                        <p className="text-[10px] text-on-surface-variant">CUIT: {c.cuit || '—'}</p>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {cliente && (
            <div className="space-y-4 animate-in fade-in duration-500">
              {/* Info Table */}
              <div className="bg-surface-container-low rounded-xl border border-outline-variant p-4">
                <h4 className="text-label-md font-bold text-on-surface-variant uppercase mb-3">Ventas con Saldo Pendiente</h4>
                {ventasPendientes.length > 0 ? (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-on-surface-variant border-b border-outline-variant">
                        <th className="pb-2">Venta Nº</th>
                        <th className="pb-2">Fecha</th>
                        <th className="pb-2 text-right">Saldo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/30">
                      {ventasPendientes.map(v => (
                        <tr key={v.id}>
                          <td className="py-2 font-bold">V-{v.numero.toString().padStart(7, '0')}</td>
                          <td className="py-2">{formatDate(v.fecha)}</td>
                          <td className="py-2 text-right font-bold text-error">{formatCurrency(v.saldo_pendiente)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-body-sm text-on-surface-variant italic">Este cliente no tiene deudas pendientes.</p>
                )}
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1">
                  <label className="text-label-sm font-bold text-on-surface-variant uppercase">Método de Pago</label>
                  <select 
                    className="w-full border border-outline-variant rounded-xl p-3 text-body-md"
                    value={metodo}
                    onChange={e => setMetodo(e.target.value as PagoMetodo)}
                  >
                    {METODOS_PAGO.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-label-sm font-bold text-on-surface-variant uppercase">Monto a Cobrar</label>
                  <input 
                    type="number" 
                    step="0.01"
                    className="w-full border border-outline-variant rounded-xl p-3 text-body-lg font-bold text-secondary text-right"
                    value={monto}
                    onChange={e => setMonto(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-label-sm font-bold text-on-surface-variant uppercase">Fecha de Pago</label>
                  <input 
                    type="date" 
                    className="w-full border border-outline-variant rounded-xl p-3 text-body-md"
                    value={fecha}
                    onChange={e => setFecha(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-label-sm font-bold text-on-surface-variant uppercase">Referencia / Comprobante</label>
                  <input 
                    type="text" 
                    placeholder="Ej: Nro Transferencia"
                    className="w-full border border-outline-variant rounded-xl p-3 text-body-md"
                    value={referencia}
                    onChange={e => setReferencia(e.target.value)}
                  />
                </div>
                <div className="md:col-span-2 space-y-1">
                  <label className="text-label-sm font-bold text-on-surface-variant uppercase">Notas</label>
                  <textarea 
                    rows={2}
                    className="w-full border border-outline-variant rounded-xl p-3 text-body-sm resize-none"
                    value={notas}
                    onChange={e => setNotas(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
        </form>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-outline-variant bg-surface-container-low">
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading || !cliente} className="min-w-[140px] shadow-lg shadow-primary/20">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar Cobro'}
          </Button>
        </div>
      </div>
    </div>
  )
}
