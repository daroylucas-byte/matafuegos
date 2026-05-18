import React, { useState, useEffect } from 'react'
import { 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  TrendingUp, 
  History,
  Plus
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatCurrency, formatDate } from '../lib/utils'
import type { Pago, PagoMetodo } from '../types'
import { Button } from '../components/ui/Button'
import { PagoForm } from '../components/forms/PagoForm'
import { useLocal } from '../contexts/LocalContext'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'

const Pagos: React.FC = () => {
  const { activeLocalId } = useLocal()
  const [pagos, setPagos] = useState<(Pago & { clientes: { razon_social: string } })[]>([])
  const [loading, setLoading] = useState(true)
  const [pagoOpen, setPagoOpen] = useState(false)
  const [metodoFiltro, setMetodoFiltro] = useState<PagoMetodo | 'todos'>('todos')
  const [searchTerm, setSearchTerm] = useState('')

  const loadPagos = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('pagos')
        .select('*, clientes(razon_social)')
        .order('fecha', { ascending: false })
        .limit(50)

      if (activeLocalId) {
        query = query.eq('local_id', activeLocalId)
      }

      if (metodoFiltro !== 'todos') {
        query = query.eq('metodo', metodoFiltro)
      }

      const { data, error } = await query
      if (error) throw error
      setPagos(data || [])
    } catch (err: any) {
      console.error('Error al cargar pagos:', err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPagos()
  }, [metodoFiltro, activeLocalId])

  const stats = {
    totalMes: pagos.reduce((acc, p) => acc + p.monto, 0),
    cantidadMes: pagos.length
  }

  if (loading) return <LoadingSpinner fullPage />

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-headline-lg font-bold text-on-surface">Pagos Recibidos</h2>
          <p className="text-body-md text-on-surface-variant">Historial de cobranzas y movimientos de cuenta corriente.</p>
        </div>
        <Button size="lg" className="rounded-xl shadow-lg shadow-primary/20 gap-2" onClick={() => setPagoOpen(true)}>
          <Plus className="h-5 w-5" /> Registrar Pago
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-outline-variant p-6 rounded-2xl shadow-sm border-l-4 border-l-secondary">
          <div className="flex justify-between items-start mb-2">
            <span className="text-label-sm font-bold text-on-surface-variant uppercase tracking-wider">Total Cobrado (Vista)</span>
            <TrendingUp className="h-5 w-5 text-secondary" />
          </div>
          <p className="text-headline-md font-bold text-on-surface">{formatCurrency(stats.totalMes)}</p>
          <p className="text-xs text-on-surface-variant mt-1">Suma de los últimos 50 registros</p>
        </div>
        <div className="bg-white border border-outline-variant p-6 rounded-2xl shadow-sm border-l-4 border-l-primary">
          <div className="flex justify-between items-start mb-2">
            <span className="text-label-sm font-bold text-on-surface-variant uppercase tracking-wider">Cantidad Cobros</span>
            <History className="h-5 w-5 text-primary" />
          </div>
          <p className="text-headline-md font-bold text-on-surface">{stats.cantidadMes}</p>
          <p className="text-xs text-on-surface-variant mt-1">Transacciones procesadas</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-outline-variant shadow-sm flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-outline" />
          <input 
            type="text" 
            placeholder="Buscar por cliente o referencia..."
            className="w-full pl-10 pr-4 py-2 bg-surface-container-low border border-outline-variant rounded-lg text-body-md"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-48">
          <select 
            className="w-full border border-outline-variant rounded-lg p-2 text-body-md"
            value={metodoFiltro}
            onChange={e => setMetodoFiltro(e.target.value as any)}
          >
            <option value="todos">Todos los métodos</option>
            <option value="efectivo">Efectivo</option>
            <option value="transferencia">Transferencia</option>
            <option value="tarjeta_debito">Tarjeta Débito</option>
            <option value="tarjeta_credito">Tarjeta Crédito</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-outline-variant rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                <th className="px-6 py-4 text-label-md text-on-surface-variant uppercase">Fecha</th>
                <th className="px-6 py-4 text-label-md text-on-surface-variant uppercase">Cliente</th>
                <th className="px-6 py-4 text-label-md text-on-surface-variant uppercase">Método</th>
                <th className="px-6 py-4 text-label-md text-on-surface-variant uppercase">Referencia</th>
                <th className="px-6 py-4 text-label-md text-on-surface-variant uppercase text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {pagos.filter(p => p.clientes.razon_social.toLowerCase().includes(searchTerm.toLowerCase())).map(pago => (
                <tr key={pago.id} className="table-row-hover">
                  <td className="px-6 py-4 text-table-data tabular">{formatDate(pago.fecha)}</td>
                  <td className="px-6 py-4 text-table-data font-bold">{pago.clientes?.razon_social}</td>
                  <td className="px-6 py-4">
                    <span className="capitalize text-body-sm font-medium px-2 py-1 bg-surface-container rounded-lg border border-outline-variant/30">
                      {pago.metodo.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-table-data text-on-surface-variant">{pago.referencia || '—'}</td>
                  <td className="px-6 py-4 text-table-data text-right font-bold text-secondary tabular">
                    {formatCurrency(pago.monto)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 flex items-center justify-between bg-surface-container-low border-t border-outline-variant font-medium">
          <span className="text-body-sm text-on-surface-variant">Últimos 50 pagos</span>
          <div className="flex gap-2">
            <button className="p-1.5 rounded-lg hover:bg-surface-container disabled:opacity-30" disabled><ChevronLeft className="h-4 w-4" /></button>
            <button className="p-1.5 rounded-lg hover:bg-surface-container disabled:opacity-30" disabled><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      <PagoForm open={pagoOpen} onClose={() => setPagoOpen(false)} onSuccess={loadPagos} />
    </div>
  )
}

export default Pagos
