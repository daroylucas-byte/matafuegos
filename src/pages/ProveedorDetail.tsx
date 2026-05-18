import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  Fingerprint, 
  Edit2, 
  Wallet, 
  Truck, 
  Eye, 
  Mail, 
  Phone, 
  MapPin,
  Plus,
  ArrowLeft,
  Loader2,
  Printer
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { cn, formatCurrency, formatDate } from '../lib/utils'
import type { Proveedor } from '../types'
import { Button } from '../components/ui/Button'
import { StatusBadge } from '../components/ui/Badge'
import { CompraForm } from '../components/forms/CompraForm'
import { PagoProveedorForm } from '../components/forms/PagoProveedorForm'
import { useConfig } from '../contexts/ConfigContext'
import { CuentaCorrientePDFModal } from '../components/pdf/CuentaCorrientePDFModal'

interface CompraRow {
  id: string
  numero: string
  fecha: string
  estado: string
  total: number
  saldo_pendiente: number
}

interface ProveedorConCuenta extends Proveedor {
  saldo_deudor: number
  total_comprado: number
}

const ProveedorDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'compras' | 'pagos' | 'cuenta'>('compras')
  const [compraOpen, setCompraOpen] = useState(false)
  const [pagoOpen, setPagoOpen] = useState(false)
  const [pdfOpen, setPdfOpen] = useState(false)
  const { config } = useConfig()
  
  const [proveedor, setProveedor] = useState<ProveedorConCuenta | null>(null)
  const [compras, setCompras] = useState<CompraRow[]>([])
  const [pagos, setPagos] = useState<any[]>([])
  const [movimientos, setMovimientos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cargarDatos = async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const [
        { data: cuentaData, error: cuentaError },
        { data: comprasData, error: comprasError },
        { data: pagosData, error: pagosError }
      ] = await Promise.all([
        supabase
          .from('vista_cuenta_corriente_proveedores')
          .select('*')
          .eq('id', id)
          .single(),
        supabase
          .from('compras')
          .select('id, numero, fecha, estado, total, saldo_pendiente')
          .eq('proveedor_id', id)
          .order('fecha', { ascending: false }),
        supabase
          .from('pagos_proveedores')
          .select('*')
          .eq('proveedor_id', id)
          .order('fecha', { ascending: false })
      ])

      if (cuentaError && cuentaError.code !== 'PGRST116') throw cuentaError
      if (comprasError) throw comprasError
      if (pagosError) throw pagosError

      const { data: proveedorData, error: proveedorError } = await supabase
        .from('proveedores')
        .select('*')
        .eq('id', id)
        .single()

      if (proveedorError) throw proveedorError

      setProveedor({
        ...proveedorData,
        saldo_deudor: cuentaData?.saldo_deudor ?? 0,
        total_comprado: cuentaData?.total_comprado ?? 0,
      })
      setCompras(comprasData ?? [])
      setPagos(pagosData ?? [])

      // Armar Cuenta Corriente (Haber = Compra, Debe = Pago)
      const todosMovs = [
        ...(comprasData || []).map(c => ({
          fecha: c.fecha,
          descripcion: `Compra ${c.numero}`,
          haber: c.total,
          debe: 0,
          id: c.id,
          tipo: 'compra'
        })),
        ...(pagosData || []).map(p => ({
          fecha: p.fecha,
          descripcion: `Pago - ${p.metodo.toUpperCase()} ${p.referencia ? `(${p.referencia})` : ''}`,
          haber: 0,
          debe: p.monto,
          id: p.id,
          tipo: 'pago'
        }))
      ].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())

      let saldoAcumulado = 0
      const movimientosConSaldo = todosMovs.map(m => {
        saldoAcumulado += (m.haber - m.debe)
        return { ...m, saldo: saldoAcumulado }
      })

      setMovimientos(movimientosConSaldo.reverse())
    } catch (err: any) {
      setError(err.message || 'Error al cargar el proveedor')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarDatos()
  }, [id])

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  if (error || !proveedor) return <div className="p-8 text-center"><p className="text-error mb-4">{error || 'Proveedor no encontrado'}</p><Button onClick={() => navigate('/proveedores')}>Volver</Button></div>

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex items-center gap-5">
          <button onClick={() => navigate('/proveedores')} className="p-2 hover:bg-surface-container rounded-full text-on-surface-variant"><ArrowLeft className="h-5 w-5" /></button>
          <div className="w-16 h-16 rounded-2xl bg-secondary-container flex items-center justify-center text-on-secondary-container shadow-sm"><Truck className="h-8 w-8" /></div>
          <div>
            <h2 className="text-headline-lg font-bold text-on-surface">{proveedor.razon_social}</h2>
            <div className="flex gap-4 items-center mt-1">
              <span className="flex items-center gap-1 text-label-md text-on-surface-variant"><Fingerprint className="h-4 w-4" />CUIT: {proveedor.cuit || '—'}</span>
              <span className={cn("px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider", proveedor.activo ? "bg-secondary-container text-on-secondary-container" : "bg-surface-container-highest text-on-surface-variant")}>{proveedor.activo ? 'Activo' : 'Inactivo'}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" className="rounded-xl gap-2" onClick={() => setPdfOpen(true)}>
            <Printer className="h-4 w-4" /> 
            <span className="hidden sm:inline">Imprimir CC</span>
          </Button>
          <Button variant="secondary" className="rounded-xl gap-2"><Edit2 className="h-4 w-4" /> Editar</Button>
          <Button variant="secondary" className="gap-2 rounded-xl" onClick={() => setPagoOpen(true)}>
            <Wallet className="h-4 w-4" />
            Registrar Pago
          </Button>
          <Button className="gap-2 rounded-xl shadow-sm" onClick={() => setCompraOpen(true)}>
            <Plus className="h-4 w-4" />
            Nueva Compra
          </Button>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-outline-variant rounded-2xl p-6 shadow-sm">
            <h3 className="text-headline-sm font-bold mb-6">Información General</h3>
            <div className="space-y-5">
              <div className="flex flex-col gap-1"><span className="text-label-sm font-bold text-on-surface-variant uppercase">Email</span><div className="flex items-center gap-2 text-body-md"><Mail className="h-4 w-4 text-secondary" />{proveedor.email || '—'}</div></div>
              <div className="flex flex-col gap-1"><span className="text-label-sm font-bold text-on-surface-variant uppercase">Teléfono</span><div className="flex items-center gap-2 text-body-md"><Phone className="h-4 w-4 text-secondary" />{proveedor.telefono || '—'}</div></div>
              <div className="flex flex-col gap-1"><span className="text-label-sm font-bold text-on-surface-variant uppercase">Dirección</span><div className="flex items-start gap-2 text-body-md"><MapPin className="h-4 w-4 text-secondary mt-1" /><span>{proveedor.direccion}<br/>{proveedor.localidad}</span></div></div>
              {proveedor.notas && <div className="flex flex-col gap-1 pt-2"><span className="text-label-sm font-bold text-on-surface-variant uppercase">Notas</span><p className="text-body-sm text-on-surface-variant bg-surface-container-low p-4 rounded-xl italic leading-relaxed">{proveedor.notas}</p></div>}
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={cn(
              "bg-white border border-outline-variant rounded-xl p-4 border-l-4 shadow-sm flex flex-col",
              proveedor.saldo_deudor > 0 ? "border-l-error" : proveedor.saldo_deudor < 0 ? "border-l-secondary" : "border-l-on-surface-variant"
            )}>
              <span className="text-label-sm font-bold text-on-surface-variant uppercase">
                {proveedor.saldo_deudor > 0 ? 'Saldo a Pagar' : proveedor.saldo_deudor < 0 ? 'Saldo a Favor' : 'Sin Deuda'}
              </span>
              <span className={cn(
                "text-headline-md font-bold",
                proveedor.saldo_deudor > 0 ? "text-error" : proveedor.saldo_deudor < 0 ? "text-secondary" : "text-on-surface-variant"
              )}>
                {formatCurrency(Math.abs(proveedor.saldo_deudor))}
              </span>
            </div>
            <div className="bg-white border border-outline-variant rounded-xl p-4 border-l-4 border-l-secondary shadow-sm flex flex-col"><span className="text-label-sm font-bold text-on-surface-variant uppercase">Total Comprado (Histórico)</span><span className="text-headline-md font-bold text-secondary">{formatCurrency(proveedor.total_comprado)}</span></div>
          </div>

          <div className="bg-white border border-outline-variant rounded-2xl shadow-sm flex flex-col overflow-hidden">
            <div className="flex border-b border-outline-variant bg-surface-container-low">
              {['compras', 'pagos', 'cuenta'].map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab as any)} className={cn("px-6 py-4 text-label-md font-bold border-b-2 capitalize", activeTab === tab ? "text-secondary border-secondary bg-white" : "text-on-surface-variant border-transparent")}>
                  {tab === 'compras' ? 'Compras' : tab === 'pagos' ? 'Pagos Realizados' : 'Cuenta Corriente'}
                </button>
              ))}
            </div>

            <div className="overflow-x-auto">
              {activeTab === 'compras' && (
                <table className="w-full border-collapse">
                  <thead className="bg-surface-container-low/50 border-b border-outline-variant text-label-sm uppercase text-on-surface-variant">
                    <tr><th className="px-6 py-4 text-left">Fecha</th><th className="px-6 py-4 text-left">Nº Compra</th><th className="px-6 py-4 text-left">Estado</th><th className="px-6 py-4 text-right">Total</th><th className="px-6 py-4 text-right">Saldo</th><th className="px-6 py-4"></th></tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant text-body-md">
                    {compras.length === 0 ? <tr><td colSpan={6} className="px-6 py-10 text-center italic">Sin compras registradas</td></tr> : compras.map(c => (
                      <tr key={c.id} className="hover:bg-surface-container-lowest transition-colors">
                        <td className="px-6 py-4 tabular">{formatDate(c.fecha)}</td>
                        <td className="px-6 py-4 font-bold">{c.numero}</td>
                        <td className="px-6 py-4"><StatusBadge estado={c.estado as any} /></td>
                        <td className="px-6 py-4 text-right tabular">{formatCurrency(c.total)}</td>
                        <td className={cn("px-6 py-4 text-right font-bold tabular", c.saldo_pendiente > 0 ? "text-error" : "text-on-surface-variant")}>{formatCurrency(c.saldo_pendiente)}</td>
                        <td className="px-6 py-4 text-center"><button className="p-2 text-secondary hover:bg-secondary/10 rounded-full"><Eye className="h-4 w-4" /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {activeTab === 'pagos' && (
                <table className="w-full border-collapse">
                  <thead className="bg-surface-container-low/50 border-b border-outline-variant text-label-sm uppercase text-on-surface-variant">
                    <tr><th className="px-6 py-4 text-left">Fecha</th><th className="px-6 py-4 text-left">Método</th><th className="px-6 py-4 text-left">Referencia</th><th className="px-6 py-4 text-right">Monto</th></tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant text-body-md">
                    {pagos.length === 0 ? <tr><td colSpan={4} className="px-6 py-10 text-center italic">Sin pagos registrados</td></tr> : pagos.map(p => (
                      <tr key={p.id} className="hover:bg-surface-container-lowest transition-colors">
                        <td className="px-6 py-4 tabular">{formatDate(p.fecha)}</td>
                        <td className="px-6 py-4 capitalize">{p.metodo.replace('_', ' ')}</td>
                        <td className="px-6 py-4">{p.referencia || '—'}</td>
                        <td className="px-6 py-4 text-right font-bold text-primary tabular">{formatCurrency(p.monto)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {activeTab === 'cuenta' && (
                <table className="w-full border-collapse">
                  <thead className="bg-surface-container-low/50 border-b border-outline-variant text-label-sm uppercase text-on-surface-variant">
                    <tr><th className="px-6 py-4 text-left">Fecha</th><th className="px-6 py-4 text-left">Concepto</th><th className="px-6 py-4 text-right text-primary">Debe (Pago)</th><th className="px-6 py-4 text-right text-error">Haber (Compra)</th><th className="px-6 py-4 text-right">Saldo</th></tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant text-body-md">
                    {movimientos.length === 0 ? <tr><td colSpan={5} className="px-6 py-10 text-center italic">Sin movimientos registrados</td></tr> : movimientos.map(m => (
                      <tr key={m.id} className="hover:bg-surface-container-lowest transition-colors">
                        <td className="px-6 py-4 tabular">{formatDate(m.fecha)}</td>
                        <td className="px-6 py-4 font-medium">{m.descripcion}</td>
                        <td className="px-6 py-4 text-right text-primary tabular">{m.debe > 0 ? formatCurrency(m.debe) : '—'}</td>
                        <td className="px-6 py-4 text-right text-error tabular">{m.haber > 0 ? formatCurrency(m.haber) : '—'}</td>
                        <td className={cn(
                          "px-6 py-4 text-right font-bold tabular",
                          m.saldo > 0 ? "text-error" : m.saldo < 0 ? "text-secondary" : "text-on-surface-variant"
                        )}>
                          {formatCurrency(Math.abs(m.saldo))} {m.saldo < 0 && '(A FAVOR)'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {proveedor && (
        <>
          <CompraForm 
            open={compraOpen} 
            onClose={() => setCompraOpen(false)} 
            onSuccess={() => { setCompraOpen(false); cargarDatos(); }}
            proveedorPreseleccionado={proveedor}
          />
          <PagoProveedorForm
            open={pagoOpen}
            onClose={() => setPagoOpen(false)}
            onSuccess={() => { setPagoOpen(false); cargarDatos(); }}
            proveedorPreseleccionado={proveedor}
          />
          <CuentaCorrientePDFModal
            open={pdfOpen}
            onClose={() => setPdfOpen(false)}
            entity={proveedor}
            movimientos={movimientos}
            config={config}
            type="proveedor"
          />
        </>
      )}
    </div>
  )
}

export default ProveedorDetail
