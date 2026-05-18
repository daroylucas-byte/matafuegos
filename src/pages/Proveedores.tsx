import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  Truck,
  Edit2,
  Users,
  CheckCircle,
  AlertCircle,
  Mail,
  Phone,
  Eye
} from 'lucide-react'
import { cn, formatCurrency } from '../lib/utils'
import type { Proveedor } from '../types'
import { Button } from '../components/ui/Button'
import { ProveedorForm } from '../components/forms/ProveedorForm'
import { supabase } from '../lib/supabase'

const Proveedores: React.FC = () => {
  const navigate = useNavigate()
  const [proveedores, setProveedores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [proveedorEditar, setProveedorEditar] = useState<Partial<Proveedor> | undefined>(undefined)
  const [busqueda, setBusqueda] = useState('')

  const loadProveedores = async () => {
    try {
      setLoading(true)
      // Usamos la vista de resumen que incluye la deuda
      let query = supabase.from('vista_resumen_proveedores').select('*')
      
      if (busqueda) {
        query = query.or(`razon_social.ilike.%${busqueda}%,cuit.ilike.%${busqueda}%,email.ilike.%${busqueda}%`)
      }
      
      const { data, error } = await query.order('razon_social')

      if (error) throw error
      setProveedores(data || [])
    } catch (err: any) {
      console.error('Error cargando proveedores:', err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProveedores()
  }, [busqueda])

  const stats = {
    total: proveedores.length,
    activos: proveedores.filter(p => p.activo).length,
    inactivos: proveedores.filter(p => !p.activo).length
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-headline-lg font-bold text-on-surface">Gestión de Proveedores</h2>
          <p className="text-body-md text-on-surface-variant">Administra tus proveedores de insumos y servicios.</p>
        </div>
        <Button size="lg" className="rounded-xl shadow-sm gap-2" onClick={() => { setProveedorEditar(undefined); setFormOpen(true) }}>
          <Truck className="h-5 w-5" />
          Nuevo Proveedor
        </Button>
      </div>

      <ProveedorForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={() => { setFormOpen(false); loadProveedores() }}
        proveedorInicial={proveedorEditar}
      />

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-xl border border-outline-variant shadow-sm">
          <p className="text-label-sm text-on-surface-variant mb-1 uppercase tracking-wider">Total Proveedores</p>
          <div className="flex items-center gap-2">
            <span className="text-headline-md font-bold text-on-surface">{stats.total}</span>
            <div className="p-1.5 bg-primary-container/10 text-primary rounded-lg ml-auto">
              <Users className="h-4 w-4" />
            </div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-outline-variant shadow-sm">
          <p className="text-label-sm text-on-surface-variant mb-1 uppercase tracking-wider">Activos</p>
          <div className="flex items-center gap-2">
            <span className="text-headline-md font-bold text-secondary">{stats.activos}</span>
            <div className="p-1.5 bg-secondary-container/10 text-secondary rounded-lg ml-auto">
              <CheckCircle className="h-4 w-4" />
            </div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-outline-variant shadow-sm">
          <p className="text-label-sm text-on-surface-variant mb-1 uppercase tracking-wider">Inactivos</p>
          <div className="flex items-center gap-2">
            <span className="text-headline-md font-bold text-error">{stats.inactivos}</span>
            <div className="p-1.5 bg-error-container/10 text-error rounded-lg ml-auto">
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-outline-variant shadow-sm">
        <div className="flex-1 min-w-[300px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-outline" />
          <input
            type="text"
            placeholder="Buscar por razón social, CUIT o email..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-outline-variant rounded-lg text-body-md bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:border-primary transition-all"
          />
        </div>
        <Button variant="secondary" className="gap-2">
          <Filter className="h-4 w-4" />
          Filtros
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white border border-outline-variant rounded-xl overflow-hidden shadow-sm relative">
        {loading && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead className="bg-surface-container-low border-b border-outline-variant">
              <tr>
                <th className="px-6 py-4 text-label-md text-on-surface-variant">Proveedor</th>
                <th className="px-6 py-4 text-label-md text-on-surface-variant">CUIT</th>
                <th className="px-6 py-4 text-label-md text-on-surface-variant">Contacto</th>
                <th className="px-6 py-4 text-label-md text-on-surface-variant text-right">Deuda</th>
                <th className="px-6 py-4 text-label-md text-on-surface-variant text-center">Estado</th>
                <th className="px-6 py-4 text-label-md text-on-surface-variant text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {proveedores.length === 0 && !loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-on-surface-variant italic">
                    {busqueda ? 'Sin resultados para la búsqueda' : 'No hay proveedores registrados'}
                  </td>
                </tr>
              ) : (
                proveedores.map((prov) => (
                  <tr key={prov.id} className="table-row-hover">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-body-md font-bold text-on-surface">{prov.razon_social}</span>
                        <span className="text-xs text-on-surface-variant">ID: {prov.id.toString().substring(0, 8)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-table-data tabular">{prov.cuit || '—'}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col text-xs text-on-surface-variant">
                        <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {prov.email || '—'}</span>
                        <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {prov.telefono || ''}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={cn(
                        "font-bold tabular",
                        (prov.saldo_deudor || 0) > 0 ? "text-error" : (prov.saldo_deudor || 0) < 0 ? "text-secondary" : "text-on-surface-variant"
                      )}>
                        {formatCurrency(Math.abs(prov.saldo_deudor || 0))}
                        {(prov.saldo_deudor || 0) < 0 && <span className="ml-1 text-[8px] uppercase">a favor</span>}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                        prov.activo
                          ? "bg-secondary-container text-on-secondary-container"
                          : "bg-surface-container-highest text-on-surface-variant"
                      )}>
                        {prov.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-1">
                        <button
                          onClick={() => navigate(`/proveedores/${prov.id}`)}
                          className="p-2 text-primary hover:bg-primary-container/20 rounded-lg transition-all"
                          title="Ver detalle"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => { setProveedorEditar(prov); setFormOpen(true) }}
                          className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container-high rounded-lg transition-all"
                          title="Editar"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 flex items-center justify-between bg-surface-container-lowest border-t border-outline-variant">
          <p className="text-body-sm text-on-surface-variant">
            Mostrando {proveedores.length} proveedores
          </p>
          <div className="flex items-center gap-2">
            <button className="p-1.5 hover:bg-surface-container rounded-lg transition-colors text-on-surface-variant disabled:opacity-30" disabled>
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button className="p-1.5 hover:bg-surface-container rounded-lg transition-colors text-on-surface-variant disabled:opacity-30" disabled>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Proveedores
