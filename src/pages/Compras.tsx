import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Plus, 
  Search, 
  Eye, 
  Calendar,
  Truck
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { cn, formatCurrency } from '../lib/utils'
import { Button } from '../components/ui/Button'
import { useLocal } from '../contexts/LocalContext'
import { CompraForm } from '../components/forms/CompraForm'

const Compras: React.FC = () => {
  const navigate = useNavigate()
  const { activeLocalId } = useLocal()
  const [compras, setCompras] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const loadCompras = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('compras')
        .select(`
          *,
          proveedores (razon_social),
          locales (nombre)
        `)
      
      if (activeLocalId) {
        query = query.eq('local_id', activeLocalId)
      }

      if (searchTerm) {
        query = query.or(`numero_factura.ilike.%${searchTerm}%,proveedores.razon_social.ilike.%${searchTerm}%`)
      }
      
      const { data, error } = await query.order('fecha', { ascending: false })
      if (error) throw error
      setCompras(data || [])
    } catch (err: any) {
      console.error('Error cargando compras:', err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCompras()
  }, [searchTerm, activeLocalId])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'borrador': return 'bg-surface-container-highest text-on-surface-variant'
      case 'recibida': return 'bg-secondary-container text-on-secondary-container'
      case 'pagada': return 'bg-primary-container text-on-primary-container'
      case 'cancelada': return 'bg-error-container text-on-error-container'
      default: return 'bg-surface-container text-on-surface'
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="flex justify-between items-end gap-4">
        <div>
          <h1 className="text-headline-lg font-bold text-on-surface">Compras</h1>
          <p className="text-body-md text-on-surface-variant">Gestión de facturas de compra y reposición de stock.</p>
        </div>
        <Button size="lg" className="rounded-xl shadow-sm gap-2" onClick={() => setFormOpen(true)}>
          <Plus className="h-5 w-5" />
          Nueva Compra
        </Button>
      </div>

      <CompraForm 
        open={formOpen} 
        onClose={() => setFormOpen(false)} 
        onSuccess={() => { setFormOpen(false); loadCompras(); }}
      />

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-outline-variant flex flex-wrap gap-4 items-center shadow-sm">
        <div className="flex-1 min-w-[300px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-outline" />
          <input 
            type="text" 
            placeholder="Buscar por comprobante o proveedor..." 
            className="w-full pl-10 pr-4 py-2 border border-outline-variant rounded-lg text-body-md bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:border-primary transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white border border-outline-variant rounded-xl overflow-hidden shadow-sm relative">
        {loading && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                <th className="px-6 py-4 text-label-md text-on-surface-variant">Fecha</th>
                <th className="px-6 py-4 text-label-md text-on-surface-variant">Comprobante</th>
                <th className="px-6 py-4 text-label-md text-on-surface-variant">Proveedor</th>
                <th className="px-6 py-4 text-label-md text-on-surface-variant text-right">Total</th>
                <th className="px-6 py-4 text-label-md text-on-surface-variant text-right">Pendiente</th>
                <th className="px-6 py-4 text-label-md text-on-surface-variant text-center">Estado</th>
                <th className="px-6 py-4 text-label-md text-on-surface-variant text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {compras.length === 0 && !loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-on-surface-variant italic">
                    No se encontraron registros de compras.
                  </td>
                </tr>
              ) : (
                compras.map((compra) => (
                  <tr key={compra.id} className="hover:bg-surface-container-low transition-colors group">
                    <td className="px-6 py-4 text-table-data tabular">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3 text-on-surface-variant" />
                        {new Date(compra.fecha).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-table-data font-semibold">{compra.numero_factura || 'S/N'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Truck className="h-3 w-3 text-primary" />
                        <span className="text-table-data font-medium">{compra.proveedores?.razon_social}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-table-data text-right font-bold tabular">
                      {formatCurrency(compra.total)}
                    </td>
                    <td className="px-6 py-4 text-table-data text-right text-error font-medium tabular">
                      {formatCurrency(compra.saldo_pendiente)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                        getStatusColor(compra.estado)
                      )}>
                        {compra.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => navigate(`/compras/${compra.id}`)}
                        className="p-2 text-primary hover:bg-primary-container/20 rounded-lg transition-all"
                        title="Ver detalle"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Compras
