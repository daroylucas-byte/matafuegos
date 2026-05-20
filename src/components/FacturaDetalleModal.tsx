import React, { useRef } from 'react'
import { X, Printer, ShieldCheck, Calendar, User, FileText } from 'lucide-react'
import { formatCurrency, formatDate } from '../lib/utils'
import { Button } from './ui/Button'
import type { Local } from '../types'

interface FacturaDetalleModalProps {
  isOpen: boolean
  onClose: () => void
  factura: any
  venta: any
  sucursalConfig: any
  activeLocalName: string
}

export const FacturaDetalleModal: React.FC<FacturaDetalleModalProps> = ({
  isOpen,
  onClose,
  factura,
  venta,
  sucursalConfig,
  activeLocalName
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null)

  if (!isOpen || !factura) return null

  const handlePrint = () => {
    const printContent = printAreaRef.current?.innerHTML
    const originalContent = document.body.innerHTML

    if (printContent) {
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Comprobante de Factura - V-${venta.numero.toString().padStart(7, '0')}</title>
              <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
              <style>
                @media print {
                  body { margin: 1.5cm; font-size: 12px; }
                  .no-print { display: none; }
                }
                body { font-family: sans-serif; color: #333; }
              </style>
            </head>
            <body class="p-6">
              ${printContent}
              <script>
                window.onload = function() {
                  window.print();
                  window.close();
                }
              </script>
            </body>
          </html>
        `)
        printWindow.document.close()
      }
    }
  }

  // Helper formatting for CUIT
  const formatCuit = (cuit: string) => {
    if (!cuit) return ''
    const clean = cuit.replace(/\D/g, '')
    if (clean.length === 11) {
      return `${clean.slice(0, 2)}-${clean.slice(2, 10)}-${clean.slice(10)}`
    }
    return cuit
  }

  const letraComprobante = factura.tipo_comprobante === 'factura_a' ? 'A' : factura.tipo_comprobante === 'factura_c' ? 'C' : 'B'
  const codComprobante = factura.tipo_comprobante === 'factura_a' ? '001' : factura.tipo_comprobante === 'factura_c' ? '011' : '006'

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Comprobante de Factura Electrónica</h3>
              <p className="text-xs text-slate-500">Procesado de forma segura con ARCA / AFIP</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handlePrint} className="bg-primary hover:bg-primary/95 text-white gap-2">
              <Printer className="h-4 w-4" /> Imprimir Comprobante
            </Button>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-xl text-slate-400 hover:text-slate-600 transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-100">
          <div 
            ref={printAreaRef} 
            className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm max-w-3xl mx-auto space-y-6 text-slate-800 text-sm"
          >
            {/* AFIP Header */}
            <div className="border border-slate-300 rounded-xl overflow-hidden grid grid-cols-1 md:grid-cols-2 relative">
              {/* Box Letter in the Middle */}
              <div className="absolute left-1/2 top-0 -translate-x-1/2 w-14 h-14 bg-white border-b border-x border-slate-300 flex flex-col items-center justify-center z-10 hidden md:flex">
                <span className="text-3xl font-extrabold text-slate-900 leading-none">{letraComprobante}</span>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Cod. {codComprobante}</span>
              </div>

              {/* Left Column - Emitter info */}
              <div className="p-4 md:p-6 border-b md:border-b-0 md:border-r border-slate-300 space-y-1">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">{sucursalConfig?.razon_social || 'Matafuegos Producción'}</h2>
                <p className="text-xs text-slate-600 font-medium">Sucursal: {activeLocalName}</p>
                <p className="text-xs text-slate-500">Condición IVA: {sucursalConfig?.condicion_iva === 'responsable_inscripto' ? 'Responsable Inscripto' : 'Monotributista'}</p>
                <p className="text-xs text-slate-500">Punto de Venta: {sucursalConfig?.punto_venta?.toString().padStart(4, '0') || '0001'}</p>
              </div>

              {/* Right Column - Invoice Info */}
              <div className="p-4 md:p-6 space-y-1 md:pl-10">
                <h3 className="text-lg font-black text-slate-950 uppercase tracking-wide">
                  {factura.tipo_comprobante === 'factura_a' ? 'Factura A' : factura.tipo_comprobante === 'factura_c' ? 'Factura C' : 'Factura B'}
                </h3>
                <p className="text-xs text-slate-700">N° Comprobante: <span className="font-bold">0001-00000004</span></p>
                <p className="text-xs text-slate-600">Fecha de Emisión: <b>{formatDate(factura.created_at)}</b></p>
                <p className="text-xs text-slate-600">CUIT Emisor: <b>{formatCuit(sucursalConfig?.cuit || '30712345678')}</b></p>
                <p className="text-xs text-slate-600">Ingresos Brutos: <b>{sucursalConfig?.iibb || '123-45678-9'}</b></p>
                <p className="text-xs text-slate-600">Inicio de Actividades: <b>{sucursalConfig?.inicio_actividades || '—'}</b></p>
              </div>
            </div>

            {/* Receptor Details */}
            <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Receptor del Comprobante</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-slate-500">Razón Social / Nombre:</p>
                  <p className="font-bold text-slate-900">{factura.receptor_razon_social}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-500">CUIT / DNI:</p>
                  <p className="font-bold text-slate-900">{factura.receptor_cuit_dni ? formatCuit(factura.receptor_cuit_dni) : 'Consumidor Final'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-500">Condición frente al IVA:</p>
                  <p className="font-semibold text-slate-700">
                    {factura.receptor_iva_cond === 'responsable_inscripto' ? 'Responsable Inscripto' :
                     factura.receptor_iva_cond === 'monotributista' ? 'Monotributista' :
                     factura.receptor_iva_cond === 'exento' ? 'Exento' : 'Consumidor Final'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-500">Concepto facturado:</p>
                  <p className="font-semibold text-slate-700">{factura.concepto}</p>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                    <th className="p-3">Detalle del Producto</th>
                    <th className="p-3 text-center">Cant.</th>
                    <th className="p-3 text-right">Precio Unit.</th>
                    <th className="p-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {venta.venta_items?.map((item: any) => (
                    <tr key={item.id}>
                      <td className="p-3 font-semibold text-slate-800">
                        {item.productos?.nombre || item.descripcion}
                      </td>
                      <td className="p-3 text-center font-bold text-slate-700">{item.cantidad}</td>
                      <td className="p-3 text-right tabular text-slate-700">{formatCurrency(item.precio_unitario)}</td>
                      <td className="p-3 text-right font-bold tabular text-slate-900">{formatCurrency(item.subtotal)}</td>
                    </tr>
                  ))}
                  {venta.venta_items?.length === 0 && (
                    <tr>
                      <td className="p-3 font-semibold text-slate-800">
                        {factura.concepto}
                      </td>
                      <td className="p-3 text-center font-bold text-slate-700">1</td>
                      <td className="p-3 text-right tabular text-slate-700">{formatCurrency(factura.total)}</td>
                      <td className="p-3 text-right font-bold tabular text-slate-900">{formatCurrency(factura.total)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Totals and Impuestos Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="space-y-2 text-xs text-slate-500">
                <p>Moneda: Peso Argentino ($)</p>
                <p>Fecha Vto. Pago: {formatDate(factura.created_at)}</p>
                {factura.estado === 'rechazada' && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl">
                    <p className="font-bold mb-0.5">Comprobante Rechazado:</p>
                    <p>{factura.error_mensaje}</p>
                  </div>
                )}
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <div className="flex justify-between font-medium text-slate-600">
                  <span>Neto Gravado (21.00%):</span>
                  <span className="tabular">{formatCurrency(factura.neto_gravado)}</span>
                </div>
                <div className="flex justify-between font-medium text-slate-600">
                  <span>IVA Alicuota (21%):</span>
                  <span className="tabular">{formatCurrency(factura.iva_monto)}</span>
                </div>
                <div className="border-t border-slate-300 pt-2 flex justify-between font-black text-slate-950 text-base">
                  <span>TOTAL COMPROBANTE:</span>
                  <span className="tabular">{formatCurrency(factura.total)}</span>
                </div>
              </div>
            </div>

            {/* AFIP CAE Footer Box */}
            <div className="border-2 border-slate-300 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-50">
              <div className="flex items-center gap-4">
                {/* Dummy AFIP QR Code */}
                <div className="w-16 h-16 bg-white border border-slate-300 p-1 flex items-center justify-center rounded-lg shadow-sm">
                  <div className="grid grid-cols-5 grid-rows-5 gap-0.5 w-full h-full opacity-85">
                    {Array.from({ length: 25 }).map((_, i) => (
                      <div 
                        key={i} 
                        className={`w-full h-full ${
                          (i % 2 === 0 && i % 3 === 0) || i === 0 || i === 4 || i === 20 || i === 24 || i === 12
                            ? 'bg-slate-950' 
                            : 'bg-transparent'
                        }`}
                      ></div>
                    ))}
                  </div>
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-blue-900 tracking-wider">AFIP</span>
                    <span className="text-[10px] text-slate-400 font-bold">|</span>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Factura Electrónica</span>
                  </div>
                  <p className="text-xs text-slate-500">Este comprobante oficial cuenta con validez fiscal nacional.</p>
                </div>
              </div>
              
              <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 space-y-1 w-full md:w-auto text-center md:text-left shadow-sm">
                <div className="text-xs font-bold text-slate-500">
                  CAE AUTORIZADO: <span className="font-mono text-slate-950 font-black text-sm tracking-widest pl-1">{factura.cae || 'PROCESANDO'}</span>
                </div>
                <div className="text-[11px] font-bold text-slate-400">
                  VTO. CAE: <span className="text-slate-800 pl-1">{factura.cae_vencimiento ? formatDate(factura.cae_vencimiento) : '31/12/2026'}</span>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}
