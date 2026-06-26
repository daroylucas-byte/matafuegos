import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  ChevronLeft,
  FileText,
  Clock, 
  Truck, 
  Receipt,
  Ban,
  Printer,
  ShieldCheck
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatCurrency, formatDate } from '../lib/utils'
import type { Venta, VentaEstado } from '../types'
import { Button } from '../components/ui/Button'
import { StatusBadge } from '../components/ui/Badge'
import { PagoForm } from '../components/forms/PagoForm'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { useConfig } from '../contexts/ConfigContext'
import { VentaPDFModal } from '../components/pdf/VentaPDFModal'
import { useLocal } from '../contexts/LocalContext'
import { FacturaEmitirModal } from '../components/FacturaEmitirModal'
import { FacturaDetalleModal } from '../components/FacturaDetalleModal'

const VentaDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [venta, setVenta] = useState<Venta | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagoOpen, setPagoOpen] = useState(false)
  const [pdfOpen, setPdfOpen] = useState(false)
  const [facturaOpen, setFacturaOpen] = useState(false)
  const [verFacturaOpen, setVerFacturaOpen] = useState(false)
  const [facturaArca, setFacturaArca] = useState<any | null>(null)
  const { config } = useConfig()
  const { activeLocalId, activeLocalName } = useLocal()

  const isArcaConfigured = activeLocalId && config?.servicios?.arca?.[activeLocalId]?.punto_venta

  const loadVenta = async () => {
    try {
      setLoading(true)
      const { data, error: fetchError } = await supabase
        .from('ventas')
        .select(`
          *,
          clientes(id, razon_social, cuit, email, telefono, iva_cond),
          profiles(nombre),
          venta_items(*, productos(nombre, codigo))
        `)
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError
      setVenta(data)

      // Buscar factura electrónica asociada a la venta
      const { data: factData } = await supabase
        .from('facturas_arca')
        .select('*')
        .eq('venta_id', id)
        .maybeSingle()
      
      setFacturaArca(factData)

    } catch (err: any) {
      setError(err.message || 'Error al cargar la venta')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadVenta()
  }, [id])

  const updateEstado = async (nuevoEstado: VentaEstado) => {
    try {
      const { error: updateError } = await supabase
        .from('ventas')
        .update({ estado: nuevoEstado })
        .eq('id', id)
      
      if (updateError) throw updateError
      await loadVenta()
    } catch (err: any) {
      alert('Error al actualizar estado: ' + err.message)
    }
  }

  if (loading) return <LoadingSpinner fullPage />
  if (error || !venta) return <div className="p-8 text-error font-bold text-center">{error || 'Venta no encontrada'}</div>

  // Obtener la configuración específica de ARCA para este local
  const sucursalConfig = activeLocalId ? config?.servicios?.arca?.[activeLocalId] : null

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-surface-container rounded-full transition-colors">
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div>
            <h2 className="text-headline-sm font-bold text-on-surface">Venta V-{venta.numero.toString().padStart(7, '0')}</h2>
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge estado={venta.estado} />
              <span className="text-body-sm text-on-surface-variant">Creada el {formatDate(venta.fecha)}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="secondary" 
            className="border-outline-variant hover:bg-surface-container-high text-on-surface"
            onClick={() => setPdfOpen(true)}
          >
            <Printer className="h-4 w-4 mr-2" /> Imprimir
          </Button>

          {isArcaConfigured && venta.estado !== 'cancelado' && venta.estado !== 'facturado' && !facturaArca && (
            <Button 
              className="bg-emerald-600 hover:bg-emerald-600/95 text-white shadow-emerald-600/10"
              onClick={() => setFacturaOpen(true)}
            >
              <Receipt className="h-4 w-4 mr-2" /> Facturar ARCA
            </Button>
          )}

          {facturaArca && (
            <Button 
              className="bg-sky-600 hover:bg-sky-600/95 text-white shadow-sky-600/10"
              onClick={() => setVerFacturaOpen(true)}
            >
              <FileText className="h-4 w-4 mr-2" /> Ver Factura ARCA
            </Button>
          )}

          {venta.estado === 'presupuesto' && <Button onClick={() => updateEstado('confirmado')}>Confirmar Pedido</Button>}
          {venta.estado === 'confirmado' && <Button onClick={() => updateEstado('en_preparacion')}>Pasar a Preparación</Button>}
          {venta.estado === 'en_preparacion' && <Button onClick={() => updateEstado('entregado')}>Marcar Entregado</Button>}
          {venta.estado === 'entregado' && <Button onClick={() => updateEstado('facturado')}>Emitir Factura</Button>}
          {venta.saldo_pendiente > 0 && (
            <Button className="bg-secondary hover:bg-secondary/90 shadow-secondary/20" onClick={() => setPagoOpen(true)}>
              <Receipt className="h-4 w-4 mr-2" /> Registrar Pago
            </Button>
          )}
          {venta.estado !== 'cancelado' && (
            <Button 
              variant="secondary" 
              className="border-error text-error hover:bg-error/5"
              onClick={() => {
                if (window.confirm('¿Estás seguro de que deseas anular esta venta? Esta acción no se puede deshacer y devolverá el stock al inventario.')) {
                  updateEstado('cancelado')
                }
              }}
            >
              <Ban className="h-4 w-4 mr-2" /> Anular Venta
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Info Cards */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white border border-outline-variant rounded-2xl p-6 shadow-sm">
            <h3 className="text-label-md font-bold text-on-surface-variant uppercase mb-4 tracking-widest">Detalle de Ítems</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-outline-variant text-label-sm text-on-surface-variant uppercase">
                    <th className="py-3">Producto / Descripción</th>
                    <th className="py-3 text-center">Cant.</th>
                    <th className="py-3 text-right">Precio Unit.</th>
                    <th className="py-3 text-right">Desc.</th>
                    <th className="py-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {venta.venta_items?.map((item: any) => (
                    <tr key={item.id} className="text-body-md">
                      <td className="py-4">
                        <div className="flex flex-col">
                          <span className="font-bold">{item.productos?.nombre || item.descripcion}</span>
                          <span className="text-[10px] text-on-surface-variant">{item.productos?.codigo || 'S/C'}</span>
                        </div>
                      </td>
                      <td className="py-4 text-center tabular">{item.cantidad}</td>
                      <td className="py-4 text-right tabular">{formatCurrency(item.precio_unitario)}</td>
                      <td className="py-4 text-right text-on-surface-variant tabular">{formatCurrency(item.descuento)}</td>
                      <td className="py-4 text-right font-bold tabular">{formatCurrency(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Factura Electrónica Info Box */}
          {facturaArca && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-600 animate-pulse" />
                  <span className="text-label-md font-bold text-slate-800 uppercase tracking-widest">Factura Electrónica ARCA</span>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase border ${
                  facturaArca.estado === 'aprobada' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                  facturaArca.estado === 'pendiente' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  'bg-rose-50 text-rose-700 border-rose-200'
                }`}>
                  {facturaArca.estado === 'aprobada' ? 'Aprobada por AFIP' : facturaArca.estado === 'pendiente' ? 'Procesando CAE' : 'Rechazada'}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <p className="text-slate-400 font-medium">Tipo Comprobante</p>
                  <p className="font-bold text-slate-900 mt-0.5 uppercase">{facturaArca.tipo_comprobante.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">CAE Autorizado</p>
                  <p className="font-mono font-bold text-slate-900 mt-0.5 tracking-wider">{facturaArca.cae || 'PROCESANDO_CAE'}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Vencimiento CAE</p>
                  <p className="font-bold text-slate-900 mt-0.5">{facturaArca.cae_vencimiento ? formatDate(facturaArca.cae_vencimiento) : '31/12/2026'}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Total Facturado</p>
                  <p className="font-bold text-emerald-600 text-sm mt-0.5">{formatCurrency(facturaArca.total)}</p>
                </div>
              </div>
              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <Button 
                  variant="secondary"
                  size="sm"
                  className="text-xs border-slate-200 hover:bg-slate-50 gap-1.5"
                  onClick={() => setVerFacturaOpen(true)}
                >
                  <FileText className="h-3.5 w-3.5" /> Ver Detalle de Factura
                </Button>
              </div>
            </div>
          )}

          <div className="bg-surface-container-low border border-outline-variant rounded-2xl p-6">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-on-surface-variant mt-1" />
              <div className="space-y-1">
                <span className="text-label-sm font-bold text-on-surface-variant uppercase">Notas de la Venta</span>
                <p className="text-body-md italic text-on-surface">{venta.notas || 'Sin notas adicionales.'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Cards */}
        <div className="space-y-6">
          <div className="bg-white border border-outline-variant rounded-2xl p-6 shadow-sm">
            <h3 className="text-label-md font-bold text-on-surface-variant uppercase mb-4 tracking-widest">Cliente</h3>
            <div className="space-y-4">
              <div className="flex flex-col">
                <span className="text-headline-sm font-bold text-primary leading-tight">{venta.clientes?.razon_social}</span>
                <span className="text-body-sm text-on-surface-variant">CUIT: {venta.clientes?.cuit || '—'}</span>
              </div>
              <div className="space-y-2 border-t border-outline-variant pt-4">
                <p className="text-body-sm flex items-center gap-2"><Clock className="h-4 w-4 text-outline" /> Atendido por: <b>{venta.profiles?.nombre}</b></p>
                <p className="text-body-sm flex items-center gap-2"><Truck className="h-4 w-4 text-outline" /> Entrega: <b>{venta.fecha_entrega ? formatDate(venta.fecha_entrega) : 'No definida'}</b></p>
              </div>
            </div>
          </div>

          <div className="bg-primary text-on-primary rounded-2xl p-6 shadow-xl shadow-primary/20 space-y-4">
            <div className="space-y-1 border-b border-on-primary/20 pb-4">
              <div className="flex justify-between text-body-md opacity-80">
                <span>Subtotal</span>
                <span>{formatCurrency(venta.subtotal)}</span>
              </div>
              <div className="flex justify-between text-body-md opacity-80">
                <span>Descuento</span>
                <span>- {formatCurrency(venta.descuento)}</span>
              </div>
            </div>
            <div className="flex justify-between items-end">
              <span className="text-label-md font-bold uppercase opacity-80">Total</span>
              <span className="text-headline-lg font-bold tabular tracking-tighter">{formatCurrency(venta.total)}</span>
            </div>
            {venta.saldo_pendiente > 0 && (
              <div className="bg-white/20 p-3 rounded-xl border border-white/30">
                <div className="flex justify-between text-xs font-bold uppercase">
                  <span>Saldo Pendiente</span>
                  <span className="text-on-primary">{formatCurrency(venta.saldo_pendiente)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <PagoForm 
        open={pagoOpen} 
        onClose={() => setPagoOpen(false)} 
        onSuccess={loadVenta} 
        clientePreseleccionado={venta.clientes as any} 
      />

      <VentaPDFModal 
        open={pdfOpen}
        onClose={() => setPdfOpen(false)}
        venta={venta}
        config={config}
      />

      <FacturaEmitirModal
        isOpen={facturaOpen}
        onClose={() => setFacturaOpen(false)}
        onSuccess={loadVenta}
        venta={venta}
      />

      <FacturaDetalleModal
        isOpen={verFacturaOpen}
        onClose={() => setVerFacturaOpen(false)}
        factura={facturaArca}
        venta={venta}
        sucursalConfig={sucursalConfig}
        activeLocalName={activeLocalName}
      />
    </div>
  )
}

export default VentaDetail
