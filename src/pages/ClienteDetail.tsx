import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Building2,
  Fingerprint,
  Edit2,
  Wallet,
  Eye,
  MapPin,
  Mail,
  Phone,
  Plus,
  ArrowLeft,
  Loader2,
  Printer
} from 'lucide-react'
import { cn, formatCurrency, formatDate } from '../lib/utils'
import type { Cliente, VentaEstado } from '../types'
import { Button } from '../components/ui/Button'
import { StatusBadge } from '../components/ui/Badge'
import { PagoForm } from '../components/forms/PagoForm'
import { VentaForm } from '../components/forms/VentaForm'
import { ClienteForm } from '../components/forms/ClienteForm'
import { supabase } from '../lib/supabase'
import { useConfig } from '../contexts/ConfigContext'
import { CuentaCorrientePDFModal } from '../components/pdf/CuentaCorrientePDFModal'

interface ClienteConCuenta extends Cliente {
  saldo_deudor: number
  total_facturado: number
  credito_disponible: number
}

interface VentaRow {
  id: string
  numero: number
  fecha: string
  estado: VentaEstado
  total: number
  saldo_pendiente: number
}

const ClienteDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'ventas' | 'pagos' | 'cuenta'>('ventas')
  const [pagoOpen, setPagoOpen] = useState(false)
  const [ventaOpen, setVentaOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [pdfOpen, setPdfOpen] = useState(false)
  const { config } = useConfig()

  const [cliente, setCliente] = useState<ClienteConCuenta | null>(null)
  const [ventas, setVentas] = useState<VentaRow[]>([])
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
        { data: ventasData, error: ventasError },
        { data: pagosData, error: pagosError }
      ] = await Promise.all([
        supabase
          .from('vista_cuenta_corriente')
          .select('*')
          .eq('id', id)
          .single(),
        supabase
          .from('ventas')
          .select('id, numero, fecha, estado, total, saldo_pendiente')
          .eq('cliente_id', id)
          .order('fecha', { ascending: false }),
        supabase
          .from('pagos')
          .select('*')
          .eq('cliente_id', id)
          .order('fecha', { ascending: false })
      ])

      if (cuentaError) throw cuentaError
      if (ventasError) throw ventasError
      if (pagosError) throw pagosError

      const { data: clienteData, error: clienteError } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', id)
        .single()

      if (clienteError) throw clienteError

      setCliente({
        ...clienteData,
        saldo_deudor: cuentaData.saldo_deudor ?? 0,
        total_facturado: cuentaData.total_facturado ?? 0,
        credito_disponible: cuentaData.credito_disponible ?? 0,
      })
      setVentas(ventasData ?? [])
      setPagos(pagosData ?? [])

      // Cuenta Corriente (ordenada asc para cálculo de saldo)
      const todosMovs = [
        ...(ventasData || [])
          .filter(v => v.estado !== 'cancelado')
          .map(v => ({
            fecha: v.fecha,
            descripcion: `Venta V-${v.numero.toString().padStart(7, '0')}`,
            debe: v.total,
            haber: 0,
            id: v.id,
            tipo: 'venta'
          })),
        ...(pagosData || []).map(p => ({
          fecha: p.fecha,
          descripcion: `Pago - ${p.metodo.toUpperCase()} ${p.referencia ? `(${p.referencia})` : ''}`,
          debe: 0,
          haber: p.monto,
          id: p.id,
          tipo: 'pago'
        }))
      ].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())

      let saldoAcumulado = 0
      const movimientosConSaldo = todosMovs.map(m => {
        saldoAcumulado += (m.debe - m.haber)
        return { ...m, saldo: saldoAcumulado }
      })

      setMovimientos(movimientosConSaldo.reverse())
    } catch (err: any) {
      setError(err.message || 'Error al cargar el cliente')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarDatos()
  }, [id])

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  if (error || !cliente) return <div className="p-8 text-center"><p className="text-error mb-4">{error || 'Cliente no encontrado'}</p><Button onClick={() => navigate('/clientes')}>Volver</Button></div>

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex items-center gap-5">
          <button onClick={() => navigate('/clientes')} className="p-2 hover:bg-surface-container rounded-full text-on-surface-variant"><ArrowLeft className="h-5 w-5" /></button>
          <div className="w-16 h-16 rounded-2xl bg-primary-container flex items-center justify-center text-on-primary-container shadow-sm"><Building2 className="h-8 w-8" /></div>
          <div>
            <h2 className="text-headline-lg font-bold text-on-surface">{cliente.razon_social}</h2>
            <div className="flex gap-4 items-center mt-1">
              <span className="flex items-center gap-1 text-label-md text-on-surface-variant"><Fingerprint className="h-4 w-4" />CUIT: {cliente.cuit || '—'}</span>
              <span className={cn("px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider", cliente.activo ? "bg-secondary-container text-on-secondary-container" : "bg-surface-container-highest text-on-surface-variant")}>{cliente.activo ? 'Activo' : 'Inactivo'}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" className="rounded-xl gap-2" onClick={() => setPdfOpen(true)}>
            <Printer className="h-4 w-4" /> 
            <span className="hidden sm:inline">Imprimir CC</span>
          </Button>
          <Button variant="secondary" className="rounded-xl gap-2" onClick={() => setEditOpen(true)}><Edit2 className="h-4 w-4" /> Editar</Button>
          <Button variant="secondary" className="rounded-xl gap-2" onClick={() => setPagoOpen(true)}><Wallet className="h-4 w-4" /> Registrar Pago</Button>
          <Button className="rounded-xl gap-2" onClick={() => setVentaOpen(true)}><Plus className="h-4 w-4" /> Nueva Venta</Button>
        </div>
      </section>

      <ClienteForm open={editOpen} onClose={() => setEditOpen(false)} onSuccess={cargarDatos} clienteInicial={cliente} />
      <PagoForm open={pagoOpen} onClose={() => setPagoOpen(false)} onSuccess={cargarDatos} clientePreseleccionado={cliente} />
      <VentaForm open={ventaOpen} onClose={() => setVentaOpen(false)} onSuccess={cargarDatos} clientePreseleccionado={cliente} />

      <CuentaCorrientePDFModal
        open={pdfOpen}
        onClose={() => setPdfOpen(false)}
        entity={cliente}
        movimientos={movimientos}
        config={config}
        type="cliente"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-outline-variant rounded-2xl p-6 shadow-sm">
            <h3 className="text-headline-sm font-bold mb-6">Información General</h3>
            <div className="space-y-5">
              <div className="flex flex-col gap-1"><span className="text-label-sm font-bold text-on-surface-variant uppercase">Email</span><div className="flex items-center gap-2 text-body-md"><Mail className="h-4 w-4 text-primary" />{cliente.email || '—'}</div></div>
              <div className="flex flex-col gap-1"><span className="text-label-sm font-bold text-on-surface-variant uppercase">Teléfono</span><div className="flex items-center gap-2 text-body-md"><Phone className="h-4 w-4 text-primary" />{cliente.telefono || '—'}</div></div>
              <div className="flex flex-col gap-1"><span className="text-label-sm font-bold text-on-surface-variant uppercase">Dirección</span><div className="flex items-start gap-2 text-body-md"><MapPin className="h-4 w-4 text-primary mt-1" /><span>{cliente.direccion}<br/>{cliente.localidad}</span></div></div>
              {cliente.notas && <div className="flex flex-col gap-1 pt-2"><span className="text-label-sm font-bold text-on-surface-variant uppercase">Notas</span><p className="text-body-sm text-on-surface-variant bg-surface-container-low p-4 rounded-xl italic leading-relaxed">{cliente.notas}</p></div>}
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-6">
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="bg-white border border-outline-variant rounded-xl p-4 border-l-4 border-l-error shadow-sm flex flex-col"><span className="text-label-sm font-bold text-on-surface-variant uppercase">Saldo Deudor</span><span className="text-headline-md font-bold text-error">{formatCurrency(cliente.saldo_deudor)}</span></div>
            <div className="bg-white border border-outline-variant rounded-xl p-4 border-l-4 border-l-primary shadow-sm flex flex-col"><span className="text-label-sm font-bold text-on-surface-variant uppercase">Límite Crédito</span><span className="text-headline-md font-bold">{formatCurrency(cliente.limite_credito)}</span></div>
            <div className="bg-white border border-outline-variant rounded-xl p-4 border-l-4 border-l-secondary shadow-sm flex flex-col"><span className="text-label-sm font-bold text-on-surface-variant uppercase">Disponible</span><span className="text-headline-md font-bold text-secondary">{formatCurrency(cliente.credito_disponible)}</span></div>
            <div className="bg-white border border-outline-variant rounded-xl p-4 border-l-4 border-l-tertiary shadow-sm flex flex-col"><span className="text-label-sm font-bold text-on-surface-variant uppercase">Histórico</span><span className="text-headline-md font-bold text-tertiary">{formatCurrency(cliente.total_facturado)}</span></div>
          </div>

          <div className="bg-white border border-outline-variant rounded-2xl shadow-sm flex flex-col overflow-hidden">
            <div className="flex border-b border-outline-variant bg-surface-container-low">
              {['ventas', 'pagos', 'cuenta'].map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab as any)} className={cn("px-6 py-4 text-label-md font-bold border-b-2 capitalize", activeTab === tab ? "text-primary border-primary bg-white" : "text-on-surface-variant border-transparent")}>
                  {tab.replace('cuenta', 'Cuenta Corriente')}
                </button>
              ))}
            </div>

            <div className="overflow-x-auto">
              {activeTab === 'ventas' && (
                <table className="w-full border-collapse">
                  <thead className="bg-surface-container-low/50 border-b border-outline-variant text-label-sm uppercase text-on-surface-variant">
                    <tr><th className="px-6 py-4 text-left">Fecha</th><th className="px-6 py-4 text-left">Nº Venta</th><th className="px-6 py-4 text-left">Estado</th><th className="px-6 py-4 text-right">Total</th><th className="px-6 py-4 text-right">Saldo</th><th className="px-6 py-4"></th></tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant text-body-md">
                    {ventas.length === 0 ? <tr><td colSpan={6} className="px-6 py-10 text-center italic">Sin ventas registradas</td></tr> : ventas.map(v => (
                      <tr key={v.id} className="hover:bg-surface-container-lowest transition-colors">
                        <td className="px-6 py-4 tabular">{formatDate(v.fecha)}</td>
                        <td className="px-6 py-4 font-bold">V-{v.numero.toString().padStart(7, '0')}</td>
                        <td className="px-6 py-4"><StatusBadge estado={v.estado} /></td>
                        <td className="px-6 py-4 text-right tabular">{formatCurrency(v.total)}</td>
                        <td className={cn("px-6 py-4 text-right font-bold tabular", v.saldo_pendiente > 0 ? "text-error" : "text-on-surface-variant")}>{formatCurrency(v.saldo_pendiente)}</td>
                        <td className="px-6 py-4 text-center"><button onClick={() => navigate(`/ventas/${v.id}`)} className="p-2 text-primary hover:bg-primary/10 rounded-full"><Eye className="h-4 w-4" /></button></td>
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
                        <td className="px-6 py-4 text-right font-bold text-secondary tabular">{formatCurrency(p.monto)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {activeTab === 'cuenta' && (
                <table className="w-full border-collapse">
                  <thead className="bg-surface-container-low/50 border-b border-outline-variant text-label-sm uppercase text-on-surface-variant">
                    <tr><th className="px-6 py-4 text-left">Fecha</th><th className="px-6 py-4 text-left">Concepto</th><th className="px-6 py-4 text-right text-error">Debe</th><th className="px-6 py-4 text-right text-secondary">Haber</th><th className="px-6 py-4 text-right">Saldo</th></tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant text-body-md">
                    {movimientos.length === 0 ? <tr><td colSpan={5} className="px-6 py-10 text-center italic">Sin movimientos registrados</td></tr> : movimientos.map(m => (
                      <tr key={m.id} className="hover:bg-surface-container-lowest transition-colors">
                        <td className="px-6 py-4 tabular">{formatDate(m.fecha)}</td>
                        <td className="px-6 py-4 font-medium">{m.descripcion}</td>
                        <td className="px-6 py-4 text-right text-error tabular">{m.debe > 0 ? formatCurrency(m.debe) : '—'}</td>
                        <td className="px-6 py-4 text-right text-secondary tabular">{m.haber > 0 ? formatCurrency(m.haber) : '—'}</td>
                        <td className="px-6 py-4 text-right font-bold tabular">{formatCurrency(m.saldo)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ClienteDetail
