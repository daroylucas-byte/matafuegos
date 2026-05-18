import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  ChevronLeft, 
  Truck, 
  FileText, 
  Receipt,
  Clock, 
  Ban,
  CheckCircle2
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatCurrency, formatDate } from '../lib/utils'
import type { CompraEstado } from '../types'
import { Button } from '../components/ui/Button'
import { StatusBadge } from '../components/ui/Badge'
import { PagoProveedorForm } from '../components/forms/PagoProveedorForm'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'

const CompraDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [compra, setCompra] = useState<any | null>(null)
  const [pagos, setPagos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagoOpen, setPagoOpen] = useState(false)
  const [creditoDisponible, setCreditoDisponible] = useState(0)
  const [aplicandoCredito, setAplicandoCredito] = useState(false)

  const loadCompra = async () => {
    try {
      setLoading(true)
      const { data, error: fetchError } = await supabase
        .from('compras')
        .select(`
          *,
          proveedores(id, razon_social, cuit, email, telefono),
          profiles(nombre),
          compra_items(*, productos(nombre, codigo))
        `)
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError
      setCompra(data)

      // Cargar pagos imputados a esta compra
      const { data: imputaciones, error: impError } = await supabase
        .from('pago_proveedor_imputaciones')
        .select(`
          id,
          monto,
          pagos_proveedores (
            id,
            fecha,
            metodo,
            referencia
          )
        `)
        .eq('compra_id', id)
      
      if (!impError && imputaciones) {
        setPagos(imputaciones)
      }

      // 3. Verificar si el proveedor tiene saldo a favor (crédito)
      const { data: provData } = await supabase
        .from('vista_resumen_proveedores')
        .select('saldo_deudor')
        .eq('id', data.proveedor_id)
        .single()
      
      if (provData && provData.saldo_deudor < 0) {
        setCreditoDisponible(Math.abs(provData.saldo_deudor))
      } else {
        setCreditoDisponible(0)
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar la compra')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCompra()
  }, [id])

  const handleAplicarCredito = async () => {
    try {
      setAplicandoCredito(true)
      const { data, error: rpcError } = await supabase.rpc('aplicar_credito_proveedor', { 
        p_compra_id: id 
      })
      
      if (rpcError) throw rpcError
      
      if (data > 0) {
        alert(`Se aplicó un crédito de ${formatCurrency(data)} a esta compra.`)
        await loadCompra()
      } else {
        alert('No se pudo aplicar crédito. Verifique el saldo del proveedor.')
      }
    } catch (err: any) {
      alert('Error al aplicar crédito: ' + err.message)
    } finally {
      setAplicandoCredito(false)
    }
  }

  const updateEstado = async (nuevoEstado: CompraEstado) => {
    try {
      const { error: updateError } = await supabase
        .from('compras')
        .update({ estado: nuevoEstado })
        .eq('id', id)
      
      if (updateError) throw updateError
      await loadCompra()
    } catch (err: any) {
      alert('Error al actualizar estado: ' + err.message)
    }
  }

  if (loading) return <LoadingSpinner fullPage />
  if (error || !compra) return <div className="p-8 text-error font-bold text-center">{error || 'Compra no encontrada'}</div>

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-surface-container rounded-full transition-colors">
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div>
            <h2 className="text-headline-sm font-bold text-on-surface">Compra C-{compra.numero.toString().padStart(5, '0')}</h2>
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge estado={compra.estado} />
              <span className="text-body-sm text-on-surface-variant">Registrada el {formatDate(compra.fecha)}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {compra.estado === 'borrador' && (
            <Button onClick={() => updateEstado('recibida')}>
              <CheckCircle2 className="h-4 w-4 mr-2" /> Marcar Recibida
            </Button>
          )}
          
          {compra.saldo_pendiente > 0 && (
            <div className="flex gap-2">
              {creditoDisponible > 0 && (
                <Button 
                  variant="secondary" 
                  className="border-secondary text-secondary hover:bg-secondary/5" 
                  onClick={handleAplicarCredito}
                  isLoading={aplicandoCredito}
                >
                  <Receipt className="h-4 w-4 mr-2" /> Usar Crédito (${formatCurrency(creditoDisponible)})
                </Button>
              )}
              <Button variant="primary" className="bg-secondary hover:bg-secondary/90 shadow-secondary/20" onClick={() => setPagoOpen(true)}>
                <Receipt className="h-4 w-4 mr-2" /> Registrar Pago
              </Button>
            </div>
          )}

          {compra.estado !== 'cancelada' && (
            <Button 
              variant="danger" 
              className="border-error text-error hover:bg-error/5"
              onClick={() => {
                if (window.confirm('¿Estás seguro de que deseas anular esta compra? Se revertirá el ingreso de stock.')) {
                  updateEstado('cancelada')
                }
              }}
            >
              <Ban className="h-4 w-4 mr-2" /> Anular Compra
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Info Cards */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white border border-outline-variant rounded-2xl p-6 shadow-sm">
            <h3 className="text-label-md font-bold text-on-surface-variant uppercase mb-4 tracking-widest text-[10px]">Detalle de Artículos</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-outline-variant text-[10px] text-on-surface-variant uppercase tracking-wider">
                    <th className="py-3">Producto / Descripción</th>
                    <th className="py-3 text-center">Cant.</th>
                    <th className="py-3 text-right">Costo Unit.</th>
                    <th className="py-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {compra.compra_items?.map((item: any) => (
                    <tr key={item.id} className="text-body-md">
                      <td className="py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-on-surface">{item.productos?.nombre || item.descripcion}</span>
                          <span className="text-[10px] text-on-surface-variant uppercase">{item.productos?.codigo || 'S/C'}</span>
                        </div>
                      </td>
                      <td className="py-4 text-center tabular">{item.cantidad}</td>
                      <td className="py-4 text-right tabular">{formatCurrency(item.precio_unitario)}</td>
                      <td className="py-4 text-right font-bold tabular text-primary">{formatCurrency(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-surface-container-low border border-outline-variant rounded-2xl p-6">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-on-surface-variant mt-1" />
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Notas / Observaciones</span>
                <p className="text-body-md italic text-on-surface">{compra.notas || 'Sin observaciones.'}</p>
              </div>
            </div>
          </div>

          {pagos.length > 0 && (
            <div className="bg-white border border-outline-variant rounded-2xl p-6 shadow-sm">
              <h3 className="text-label-md font-bold text-on-surface-variant uppercase mb-4 tracking-widest text-[10px]">Pagos Aplicados</h3>
              <div className="space-y-4">
                {pagos.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-surface-container-lowest rounded-xl border border-outline-variant">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-secondary/10 rounded-lg">
                        <Receipt className="h-4 w-4 text-secondary" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-body-md font-bold">{formatDate(p.pagos_proveedores?.fecha)}</span>
                        <span className="text-[10px] text-on-surface-variant uppercase">{p.pagos_proveedores?.metodo} {p.pagos_proveedores?.referencia && `- ${p.pagos_proveedores.referencia}`}</span>
                      </div>
                    </div>
                    <span className="text-title-medium font-bold text-secondary">{formatCurrency(p.monto)}</span>
                  </div>
                ))}
                <div className="pt-2 border-t border-outline-variant flex justify-between items-center">
                  <span className="text-label-sm font-bold text-on-surface-variant uppercase">Total Pagado</span>
                  <span className="text-title-medium font-bold text-secondary">
                    {formatCurrency(pagos.reduce((acc, p) => acc + p.monto, 0))}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Cards */}
        <div className="space-y-6">
          <div className="bg-white border border-outline-variant rounded-2xl p-6 shadow-sm">
            <h3 className="text-[10px] font-bold text-on-surface-variant uppercase mb-4 tracking-widest">Proveedor</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Truck className="h-5 w-5 text-primary" />
                </div>
                <div className="flex flex-col">
                  <span className="text-headline-sm font-bold text-on-surface leading-tight">{compra.proveedores?.razon_social}</span>
                  <span className="text-body-sm text-on-surface-variant">CUIT: {compra.proveedores?.cuit || '—'}</span>
                </div>
              </div>
              <div className="space-y-2 border-t border-outline-variant pt-4">
                <p className="text-body-sm flex items-center gap-2"><FileText className="h-4 w-4 text-outline" /> Factura: <b>{compra.numero_factura || 'S/N'}</b></p>
                <p className="text-body-sm flex items-center gap-2"><Clock className="h-4 w-4 text-outline" /> Registrado por: <b>{compra.profiles?.nombre || 'S/D'}</b></p>
              </div>
            </div>
          </div>

          <div className="bg-primary text-on-primary rounded-2xl p-6 shadow-xl shadow-primary/20 space-y-4">
            <div className="space-y-1 border-b border-on-primary/20 pb-4 opacity-80">
              <div className="flex justify-between text-body-md">
                <span>Subtotal Neto</span>
                <span>{formatCurrency(compra.subtotal)}</span>
              </div>
            </div>
            <div className="flex justify-between items-end">
              <span className="text-label-md font-bold uppercase opacity-80">Total Compra</span>
              <span className="text-headline-lg font-bold tabular tracking-tighter">{formatCurrency(compra.total)}</span>
            </div>
            {compra.saldo_pendiente > 0 && (
              <div className="bg-error-container text-on-error-container p-4 rounded-xl shadow-inner">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold uppercase tracking-widest">Saldo Pendiente</span>
                  <span className="text-headline-sm font-black tabular">{formatCurrency(compra.saldo_pendiente)}</span>
                </div>
              </div>
            )}
            {compra.saldo_pendiente <= 0 && (
              <div className="bg-white/20 p-3 rounded-xl border border-white/30 flex items-center gap-2 justify-center">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-widest">Pagado Totalmente</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <PagoProveedorForm 
        open={pagoOpen} 
        onClose={() => setPagoOpen(false)} 
        onSuccess={loadCompra} 
        proveedorPreseleccionado={compra.proveedores}
        compraId={compra.id}
      />
    </div>
  )
}

export default CompraDetail
