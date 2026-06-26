import React, { useState, useEffect } from 'react'
import {
  Receipt,
  Building2,
  FileText,
  HelpCircle,
  QrCode
} from 'lucide-react'
import { useLocal } from '../contexts/LocalContext'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'
import { formatCurrency, cn } from '../lib/utils'
import toast from 'react-hot-toast'
import type { Venta } from '../types'

interface FacturaEmitirModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  venta?: Venta | null
}

type TipoComprobante = 'factura_a' | 'factura_b' | 'factura_c'
type ReceptorIvaCond = 'responsable_inscripto' | 'monotributo' | 'consumidor_final' | 'exento'
type ReceptorTipoDoc = 'cuit' | 'dni' | 'sin_doc'

export const FacturaEmitirModal: React.FC<FacturaEmitirModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  venta = null
}) => {
  const { activeLocalId } = useLocal()

  const [loading, setLoading] = useState(false)
  const [comprobanteEmitido, setComprobanteEmitido] = useState<any | null>(null)
  
  // Form fields
  const [tipoComprobante, setTipoComprobante] = useState<TipoComprobante>('factura_b')
  const [ivaCond, setIvaCond] = useState<ReceptorIvaCond>('consumidor_final')
  const [tipoDoc, setTipoDoc] = useState<ReceptorTipoDoc>('sin_doc')
  const [cuitDni, setCuitDni] = useState('')
  const [razonSocial, setRazonSocial] = useState('Consumidor Final')
  const [concepto, setConcepto] = useState('Ventas diarias')
  
  // Pricing & Tax calculations
  const [netoGravado, setNetoGravado] = useState<number>(0)
  const [ivaAlicuota, setIvaAlicuota] = useState<number>(21) // 21%
  const [ivaMonto, setIvaMonto] = useState<number>(0)
  const [total, setTotal] = useState<number>(0)

  // Reset/Initialize form
  useEffect(() => {
    if (isOpen) {
      setComprobanteEmitido(null)
      if (venta) {
        // VENTA INVOICING MODE
        const nombreReceptor = venta.clientes?.razon_social || venta.clientes?.nombre_fantasia || 'Consumidor Final'
        const cuitReceptor = venta.clientes?.cuit || ''
        
        setRazonSocial(nombreReceptor)
        setCuitDni(cuitReceptor)
        
        // Auto-detect document type and IVA condition from client
        const clienteIvaCond = (venta.clientes?.iva_cond as ReceptorIvaCond) || 'consumidor_final'
        setIvaCond(clienteIvaCond)

        if (cuitReceptor) {
          const cleaned = cuitReceptor.replace(/\D/g, '')
          if (cleaned.length === 11) {
            setTipoDoc('cuit')
          } else {
            setTipoDoc('dni')
          }
        } else {
          setTipoDoc('sin_doc')
        }

        setConcepto(`Venta V-${venta.numero.toString().padStart(7, '0')}`)
        
        // Populate totals based on sale
        const vTotal = venta.total
        const vNeto = Number((vTotal / (1 + 21 / 100)).toFixed(2))
        const vIva = Number((vTotal - vNeto).toFixed(2))
        
        setNetoGravado(vNeto)
        setIvaAlicuota(21)
        setIvaMonto(vIva)
        setTotal(vTotal)
      } else {
        // FREE INVOICE MODE
        setRazonSocial('Consumidor Final')
        setCuitDni('')
        setTipoDoc('sin_doc')
        setIvaCond('consumidor_final')
        setTipoComprobante('factura_b')
        setConcepto('Ventas generales del día')
        setNetoGravado(0)
        setIvaAlicuota(21)
        setIvaMonto(0)
        setTotal(0)
      }
    }
  }, [isOpen, venta])

  // Reactive price calculator
  const handleTotalChange = (val: number) => {
    setTotal(val)
    if (ivaAlicuota === 0) {
      setNetoGravado(val)
      setIvaMonto(0)
    } else {
      const net = Number((val / (1 + ivaAlicuota / 100)).toFixed(2))
      setNetoGravado(net)
      setIvaMonto(Number((val - net).toFixed(2)))
    }
  }

  const handleNetoChange = (val: number) => {
    setNetoGravado(val)
    if (ivaAlicuota === 0) {
      setIvaMonto(0)
      setTotal(val)
    } else {
      const iva = Number((val * (ivaAlicuota / 100)).toFixed(2))
      setIvaMonto(iva)
      setTotal(Number((val + iva).toFixed(2)))
    }
  }

  const handleAlicuotaChange = (pct: number) => {
    setIvaAlicuota(pct)
    if (pct === 0) {
      setIvaMonto(0)
      setTotal(netoGravado)
    } else {
      // Keep Neto and recalculate total
      const iva = Number((netoGravado * (pct / 100)).toFixed(2))
      setIvaMonto(iva)
      setTotal(Number((netoGravado + iva).toFixed(2)))
    }
  }

  // Handle auto document change behavior
  useEffect(() => {
    if (ivaCond === 'responsable_inscripto') {
      setTipoComprobante('factura_a')
      setTipoDoc('cuit')
    } else if (ivaCond === 'monotributo') {
      setTipoComprobante('factura_b')
    } else {
      setTipoComprobante('factura_b')
    }
  }, [ivaCond])

  const handleEmitirFactura = async (e: React.FormEvent) => {
    e.preventDefault()

    if (tipoDoc !== 'sin_doc' && !cuitDni.trim()) {
      toast.error('Por favor, ingresa el número de documento.')
      return
    }
    if (!razonSocial.trim()) {
      toast.error('Por favor, ingresa la razón social del receptor.')
      return
    }
    if (!concepto.trim()) {
      toast.error('Por favor, ingresa el concepto o detalle.')
      return
    }
    if (total <= 0) {
      toast.error('El importe total debe ser mayor a cero.')
      return
    }
    if (!venta?.id || !activeLocalId) {
      toast.error('No se pudo identificar la venta o sucursal.')
      return
    }

    try {
      setLoading(true)

      const backendUrl = import.meta.env.VITE_ARCA_BACKEND_URL
      const response = await fetch(`${backendUrl}/api/facturar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ventaId: venta.id, localId: activeLocalId })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error en el servidor ARCA')
      }

      setComprobanteEmitido(result.factura)
      toast.success('¡Factura emitida con éxito!')
      onSuccess()

    } catch (err: any) {
      console.error('Error al emitir factura:', err)
      toast.error('Error al emitir comprobante: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={venta ? `Facturar Venta V-${venta.numero.toString().padStart(7, '0')}` : 'Emitir Factura Libre (ARCA)'}
      maxWidth="xl"
    >
      {comprobanteEmitido ? (
        // SUCCESS DIALOG: CAE APPROVED DISPLAY
        <div className="space-y-6 text-center py-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
            <QrCode className="h-9 w-9" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-headline-md font-bold text-on-surface">¡Comprobante Emitido!</h3>
            <p className="text-body-md text-on-surface-variant max-w-md mx-auto">
              El comprobante fue procesado y autorizado por los servidores de ARCA.
            </p>
          </div>

          <div className="bg-surface-container-low border border-outline-variant p-6 rounded-2xl max-w-lg mx-auto text-left space-y-4">
            <div className="flex justify-between border-b border-outline-variant pb-2">
              <span className="text-label-md font-bold text-on-surface-variant uppercase">Comprobante</span>
              <span className="font-mono text-body-md font-bold text-primary uppercase">
                {comprobanteEmitido.tipo_comprobante.replace('_', ' ')}
              </span>
            </div>
            <div className="flex justify-between border-b border-outline-variant pb-2">
              <span className="text-label-md font-bold text-on-surface-variant uppercase">Receptor</span>
              <span className="text-body-md text-on-surface font-bold truncate max-w-[250px]">{comprobanteEmitido.receptor_razon_social}</span>
            </div>
            <div className="flex justify-between border-b border-outline-variant pb-2">
              <span className="text-label-md font-bold text-on-surface-variant uppercase">Concepto</span>
              <span className="text-body-md text-on-surface truncate max-w-[250px]">{comprobanteEmitido.concepto}</span>
            </div>
            <div className="flex justify-between border-b border-outline-variant pb-2">
              <span className="text-label-md font-bold text-on-surface-variant uppercase">Importe Total</span>
              <span className="text-body-md text-on-surface font-extrabold">{formatCurrency(comprobanteEmitido.total)}</span>
            </div>
            <div className="flex justify-between bg-white p-3 rounded-xl border border-outline-variant">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-emerald-700">CAE Autorizado</span>
                <span className="font-mono text-body-md font-bold text-emerald-800 tracking-wider">
                  {comprobanteEmitido.cae || 'PROCESANDO_CAE'}
                </span>
              </div>
              <div className="flex flex-col text-right">
                <span className="text-[10px] uppercase font-bold text-slate-500">Vencimiento CAE</span>
                <span className="text-xs text-on-surface font-medium">
                  {new Date(comprobanteEmitido.cae_vencimiento).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

<div className="flex justify-center pt-2">
            <Button className="rounded-xl px-8" onClick={onClose}>
              Entendido
            </Button>
          </div>
        </div>
      ) : (
        // FORM DIALOG: INPUT CONFIGURATION & SUBMIT
        <form onSubmit={handleEmitirFactura} className="space-y-6">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* LEFT PANEL: RECEIVER INFORMATION */}
            <div className="space-y-4 bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant">
              <h3 className="text-body-md font-bold text-primary flex items-center gap-2 mb-2">
                <Building2 className="h-4.5 w-4.5" /> Datos del Receptor (Receptor)
              </h3>
              
              {/* VAT / IVA Condition */}
              <div className="space-y-2">
                <label className="text-body-sm font-bold text-on-surface">Condición frente al IVA</label>
                <select
                  value={ivaCond}
                  onChange={(e) => setIvaCond(e.target.value as ReceptorIvaCond)}
                  disabled={loading}
                  className="w-full p-2.5 bg-white border border-outline rounded-xl text-body-md focus:ring-2 focus:ring-primary outline-none"
                >
                  <option value="consumidor_final">Consumidor Final</option>
                  <option value="responsable_inscripto">Responsable Inscripto</option>
                  <option value="monotributo">Monotributista / Responsable Monotributo</option>
                  <option value="exento">Sujeto Exento</option>
                </select>
              </div>

              {/* Document Type & number */}
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-2 col-span-1">
                  <label className="text-body-sm font-bold text-on-surface">Documento</label>
                  <select
                    value={tipoDoc}
                    onChange={(e) => {
                      setTipoDoc(e.target.value as ReceptorTipoDoc)
                      if (e.target.value === 'sin_doc') setCuitDni('')
                    }}
                    disabled={loading}
                    className="w-full p-2.5 bg-white border border-outline rounded-xl text-body-sm focus:ring-2 focus:ring-primary outline-none"
                  >
                    <option value="sin_doc">Sin Doc.</option>
                    <option value="cuit">CUIT</option>
                    <option value="dni">DNI</option>
                  </select>
                </div>
                <div className="space-y-2 col-span-2">
                  <label className="text-body-sm font-bold text-on-surface">Nro. de Documento</label>
                  <input
                    type="text"
                    value={cuitDni}
                    onChange={(e) => setCuitDni(e.target.value.replace(/\D/g, ''))}
                    placeholder={tipoDoc === 'sin_doc' ? 'Consumidor menor a tope' : 'Ej: 20384758392'}
                    disabled={loading || tipoDoc === 'sin_doc'}
                    className="w-full p-2.5 bg-white border border-outline rounded-xl text-body-md focus:ring-2 focus:ring-primary outline-none font-mono"
                  />
                </div>
              </div>

              {/* Business name / Razón social */}
              <div className="space-y-2">
                <label className="text-body-sm font-bold text-on-surface">Razón Social / Nombre</label>
                <input
                  type="text"
                  value={razonSocial}
                  onChange={(e) => setRazonSocial(e.target.value)}
                  placeholder="Ej: Matafuegos Ramos S.A."
                  disabled={loading}
                  required
                  className="w-full p-2.5 bg-white border border-outline rounded-xl text-body-md focus:ring-2 focus:ring-primary outline-none"
                />
              </div>

              {/* Receipt type select */}
              <div className="space-y-2">
                <label className="text-body-sm font-bold text-on-surface">Tipo de Comprobante</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['factura_b', 'factura_a', 'factura_c'] as TipoComprobante[]).map((tipo) => {
                    const isAllowed = ivaCond === 'responsable_inscripto' ? tipo === 'factura_a' || tipo === 'factura_b' : tipo !== 'factura_a'
                    return (
                      <button
                        key={tipo}
                        type="button"
                        onClick={() => setTipoComprobante(tipo)}
                        disabled={loading || !isAllowed}
                        className={cn(
                          "py-2 px-3 border rounded-xl font-bold text-xs uppercase transition-all select-none",
                          tipoComprobante === tipo 
                            ? "bg-primary border-primary text-white shadow-sm" 
                            : "bg-white border-outline hover:bg-surface-container-low text-on-surface",
                          !isAllowed && "opacity-40 cursor-not-allowed hover:bg-white"
                        )}
                      >
                        {tipo.replace('_', ' ')}
                      </button>
                    )
                  })}
                </div>
              </div>

            </div>

            {/* RIGHT PANEL: BILL DETAILS & TAXES */}
            <div className="space-y-4 bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant flex flex-col justify-between">
              <div>
                <h3 className="text-body-md font-bold text-primary flex items-center gap-2 mb-2">
                  <FileText className="h-4.5 w-4.5" /> Concepto e Importe de Facturación
                </h3>

                {/* Billing concept */}
                <div className="space-y-2">
                  <label className="text-body-sm font-bold text-on-surface">Concepto de Factura</label>
                  <input
                    type="text"
                    value={concepto}
                    onChange={(e) => setConcepto(e.target.value)}
                    placeholder="Ej: Abono mensual matafuegos"
                    disabled={loading}
                    required
                    className="w-full p-2.5 bg-white border border-outline rounded-xl text-body-md focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>

                {/* Tax & Alicuotas selection */}
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div className="space-y-2">
                    <label className="text-body-sm font-bold text-on-surface">Alícuota IVA</label>
                    <select
                      value={ivaAlicuota}
                      onChange={(e) => handleAlicuotaChange(Number(e.target.value))}
                      disabled={loading}
                      className="w-full p-2.5 bg-white border border-outline rounded-xl text-body-md focus:ring-2 focus:ring-primary outline-none font-medium"
                    >
                      <option value="21">21.0 % (Estándar)</option>
                      <option value="10.5">10.5 % (Reducido)</option>
                      <option value="27">27.0 % (Servicios)</option>
                      <option value="0">0.0 % (Exento/No grav.)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-body-sm font-bold text-on-surface">Importe IVA (Calcular)</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold">$</div>
                      <input
                        type="text"
                        value={ivaMonto.toFixed(2)}
                        disabled
                        className="w-full pl-7 pr-3 py-2.5 bg-surface-container border border-outline rounded-xl text-body-md font-mono text-slate-500 cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>

                {/* Net vs Gross Pricing */}
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div className="space-y-2">
                    <label className="text-body-sm font-bold text-on-surface">Subtotal Neto Gravado</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold">$</div>
                      <input
                        type="number"
                        step="0.01"
                        value={netoGravado || ''}
                        onChange={(e) => handleNetoChange(Number(e.target.value))}
                        placeholder="0.00"
                        disabled={loading}
                        className="w-full pl-7 pr-3 py-2.5 bg-white border border-outline rounded-xl text-body-md font-mono text-on-surface focus:ring-2 focus:ring-primary outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-body-sm font-bold text-primary font-bold">Importe Total Factura</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-primary font-bold">$</div>
                      <input
                        type="number"
                        step="0.01"
                        value={total || ''}
                        onChange={(e) => handleTotalChange(Number(e.target.value))}
                        placeholder="0.00"
                        disabled={loading}
                        className="w-full pl-7 pr-3 py-2.5 bg-white border-2 border-primary rounded-xl text-body-md font-mono font-bold text-primary focus:ring-2 focus:ring-primary outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* VAT summary info badge */}
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl text-xs text-blue-800 flex gap-2 items-center mt-4">
                <HelpCircle className="h-4.5 w-4.5 text-blue-500 shrink-0" />
                <p>
                  Puedes editar indistintamente el <b>Importe Total</b> o el <b>Neto Gravado</b>. El sistema calculará el desglose fiscal recíprocamente.
                </p>
              </div>
            </div>

          </div>

          {/* FORM ACTIONS FOOTER */}
          <div className="pt-4 border-t border-outline-variant flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl px-6"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              isLoading={loading}
              className="rounded-xl px-8 bg-emerald-600 hover:bg-emerald-600/95"
            >
              <Receipt className="h-4.5 w-4.5 mr-2" /> Emitir Factura ARCA
            </Button>
          </div>

        </form>
      )}
    </Modal>
  )
}
