import React, { useState, useEffect } from 'react'
import { 
  Plus, 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight,
  Calendar,
  Edit2
} from 'lucide-react'
import { formatCurrency, formatDate } from '../lib/utils'
import { Button } from '../components/ui/Button'
import { StatusBadge } from '../components/ui/Badge'
import { VentaForm } from '../components/forms/VentaForm'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { useLocal } from '../contexts/LocalContext'

const Ventas: React.FC = () => {
  const navigate = useNavigate()
  const { activeLocalId } = useLocal()
  const [ventas, setVentas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState('')

  const loadVentas = async () => {
    try {
      setLoading(true)
      let query = supabase.from('ventas').select('*, clientes(razon_social), profiles(nombre), locales(nombre)')
      
      if (activeLocalId) {
        console.log('Filtrando ventas por local_id:', activeLocalId)
        query = query.eq('local_id', activeLocalId)
      } else {
        console.log('Cargando ventas de TODOS los locales (admin/global)')
      }
      if (estadoFiltro && estadoFiltro !== 'Todos los estados') {
        query = query.eq('estado', estadoFiltro.toLowerCase().replace(' ', '_'))
      }
      
      const { data, error } = await query.order('fecha', { ascending: false })
      if (error) throw error
      
      let filteredData = data || []
      if (searchTerm) {
        filteredData = filteredData.filter(v => 
          v.clientes?.razon_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
          v.clientes?.cuit.includes(searchTerm)
        )
      }

      setVentas(filteredData)
    } catch (err: any) {
      console.error('Error cargando ventas:', err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadVentas()
  }, [estadoFiltro, activeLocalId])

  return (
    <div className="space-y-gutter animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div>
          <h2 className="text-headline-lg font-bold text-on-surface">Listado de Ventas</h2>
          <p className="text-body-lg text-on-surface-variant">Administra y realiza el seguimiento de todas las transacciones comerciales.</p>
        </div>
        <div className="flex gap-3">
          <Button size="lg" className="rounded-xl shadow-sm gap-2" onClick={() => setFormOpen(true)}>
            <Plus className="h-5 w-5" />
            Nueva Venta
          </Button>
        </div>
        <VentaForm 
          open={formOpen} 
          onClose={() => setFormOpen(false)} 
          onSuccess={() => { setFormOpen(false); loadVentas(); }} 
        />
      </div>

      {/* Filters Section */}
      <div className="bg-white border border-outline-variant rounded-xl p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="space-y-2">
            <label className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider">Estado</label>
            <select 
              value={estadoFiltro}
              onChange={(e) => setEstadoFiltro(e.target.value)}
              className="w-full rounded-lg border-outline-variant bg-surface text-body-md py-2.5 focus:border-primary focus:ring-primary"
            >
              <option>Todos los estados</option>
              <option value="presupuesto">Presupuesto</option>
              <option value="confirmado">Confirmado</option>
              <option value="en_preparacion">En Preparación</option>
              <option value="facturado">Facturado</option>
              <option value="cobrado">Cobrado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider">Cliente</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant" />
              <input 
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border-outline-variant bg-surface text-body-md focus:border-primary focus:ring-primary" 
                placeholder="Nombre o CUIT..." 
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider">Fecha Desde</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant" />
              <input 
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border-outline-variant bg-surface text-body-md focus:border-primary focus:ring-primary" 
                type="date"
              />
            </div>
          </div>
          <div className="flex items-end">
            <Button 
              variant="secondary" 
              className="w-full py-2.5 gap-2 border-outline h-[45px]"
              onClick={loadVentas}
            >
              <Filter className="h-4 w-4" />
              Buscar
            </Button>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white border border-outline-variant rounded-xl overflow-hidden shadow-sm relative">
        {loading && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-low border-b border-outline-variant">
              <tr>
                <th className="px-6 py-4 text-label-md text-on-surface-variant">ID</th>
                <th className="px-6 py-4 text-label-md text-on-surface-variant">Cliente</th>
                <th className="px-6 py-4 text-label-md text-on-surface-variant">Fecha</th>
                <th className="px-6 py-4 text-label-md text-on-surface-variant text-right">Total</th>
                <th className="px-6 py-4 text-label-md text-on-surface-variant text-center">Estado</th>
                <th className="px-6 py-4 text-label-md text-on-surface-variant text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {ventas.length === 0 && !loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-on-surface-variant italic">
                    No se encontraron ventas registradas.
                  </td>
                </tr>
              ) : (
                ventas.map((venta) => (
                  <tr 
                    key={venta.id} 
                    className="table-row-hover group cursor-pointer"
                    onClick={() => navigate(`/ventas/${venta.id}`)}
                  >
                    <td className="px-6 py-4 text-table-data text-on-surface font-semibold tabular">#{venta.numero?.toString().padStart(5, '0')}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-body-md font-bold text-on-surface">{venta.clientes?.razon_social || 'Cliente Eventual'}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-on-surface-variant uppercase tracking-wider">Vendedor: {venta.profiles?.nombre || '—'}</span>
                          {!activeLocalId && venta.locales?.nombre && (
                            <span className="text-[10px] font-bold text-primary uppercase">| {venta.locales.nombre}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-table-data text-on-surface tabular">{formatDate(venta.fecha)}</td>
                    <td className="px-6 py-4 text-table-data text-on-surface text-right font-medium tabular">{formatCurrency(venta.total)}</td>
                    <td className="px-6 py-4 text-center">
                      <StatusBadge estado={venta.estado} />
                    </td>
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => navigate(`/ventas/${venta.id}`)}
                        className="p-2 hover:bg-surface-container-high rounded-full transition-colors text-on-surface-variant"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-outline-variant flex items-center justify-between bg-surface-container-lowest">
          <div className="flex items-center gap-4">
            <span className="text-body-sm text-on-surface-variant">Mostrando {ventas.length} ventas</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex gap-2">
              <button className="p-1.5 hover:bg-surface-container rounded-lg text-on-surface-variant disabled:opacity-30" disabled>
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button className="p-1.5 hover:bg-surface-container rounded-lg text-on-surface-variant" disabled>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Ventas
