import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Plus, 
  Search, 
  Edit2, 
  AlertTriangle, 
  Package, 
  Wrench, 
  AlertCircle,
  FilterX,
  Eye
} from 'lucide-react'
import { cn, formatCurrency } from '../lib/utils'
import type { Producto } from '../types'
import { Button } from '../components/ui/Button'
import { ProductoForm } from '../components/forms/ProductoForm'
import { supabase } from '../lib/supabase'
import { useLocal } from '../contexts/LocalContext'

const Productos: React.FC = () => {
  const navigate = useNavigate()
  const { activeLocalId } = useLocal()
  const [productos, setProductos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [productoEditar, setProductoEditar] = useState<Partial<Producto> | undefined>(undefined)
  const [searchTerm, setSearchTerm] = useState('')

  const loadProductos = async () => {
    try {
      setLoading(true)
      // Buscamos en productos directamente para asegurar que traiga precio y costo
      let query = supabase
        .from('productos')
        .select(`
          producto_id:id,
          nombre,
          codigo,
          precio,
          costo,
          unidad,
          es_servicio,
          activo,
          stock_por_local!left(stock, local_id, locales(nombre))
        `)
      
      if (activeLocalId) {
        query = query.eq('stock_por_local.local_id', activeLocalId)
      }

      if (searchTerm) {
        query = query.or(`nombre.ilike.%${searchTerm}%,codigo.ilike.%${searchTerm}%`)
      }
      
      const { data, error } = await query.order('nombre')
      if (error) throw error

      // Aplanar los datos: si hay local filtrado, 1 fila por producto. 
      // Si no hay local filtrado, 1 fila por cada local del producto (vista global)
      const mappedData: any[] = []
      data?.forEach(p => {
        if (activeLocalId) {
          const sl = p.stock_por_local?.[0]
          mappedData.push({
            ...p,
            stock: sl?.stock || 0,
            local_id: sl?.local_id || activeLocalId,
            local_nombre: (sl?.locales as any)?.nombre || (sl?.locales as any[])?.[0]?.nombre || '—'
          })
        } else {
          // Vista global: mostrar una fila por cada local que tenga el producto
          if (!p.stock_por_local || p.stock_por_local.length === 0) {
            mappedData.push({ ...p, stock: 0, local_nombre: '—' })
          } else {
            p.stock_por_local.forEach((sl: any) => {
              mappedData.push({
                ...p,
                stock: sl.stock,
                local_id: sl.local_id,
                local_nombre: (sl?.locales as any)?.nombre || (sl?.locales as any[])?.[0]?.nombre || '—'
              })
            })
          }
        }
      })

      setProductos(mappedData)
    } catch (err: any) {
      console.error('Error cargando productos:', err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProductos()
  }, [searchTerm, activeLocalId])

  const stats = {
    total: productos.length,
    bajoStock: productos.filter(p => p.stock <= 5).length,
    servicios: productos.filter(p => !p.stock && p.stock !== 0).length // Aproximación si no hay stock
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="flex justify-between items-end gap-4">
        <div>
          <h1 className="text-headline-lg font-bold text-on-surface">Catálogo</h1>
          <p className="text-body-md text-on-surface-variant">Gestiona tus productos y servicios ofrecidos.</p>
        </div>
        <Button size="lg" className="rounded-xl shadow-sm gap-2" onClick={() => { setProductoEditar(undefined); setFormOpen(true); }}>
          <Plus className="h-5 w-5" />
          Nuevo Producto
        </Button>
      </div>

      <ProductoForm 
        open={formOpen} 
        onClose={() => setFormOpen(false)} 
        onSuccess={() => { setFormOpen(false); loadProductos(); }}
        productoInicial={productoEditar}
      />

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-outline-variant flex flex-wrap gap-4 items-center shadow-sm">
        <div className="flex-1 min-w-[300px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-outline" />
          <input 
            type="text" 
            placeholder="Buscar por nombre o código..." 
            className="w-full pl-10 pr-4 py-2 border border-outline-variant rounded-lg text-body-md bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:border-primary transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-48 space-y-1">
          <label className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider">Estado</label>
          <select className="w-full bg-surface border border-outline-variant rounded-lg py-2 px-3 text-body-md focus:ring-2 focus:ring-primary focus:border-primary transition-all">
            <option>Activo</option>
            <option>Inactivo</option>
            <option>Todos</option>
          </select>
        </div>
        <div className="flex items-end h-full pt-5">
          <button 
            onClick={() => setSearchTerm('')}
            className="text-primary font-label-md text-label-md px-4 py-2 hover:bg-surface-container-low rounded-lg transition-colors flex items-center gap-2"
          >
            <FilterX className="h-4 w-4" />
            Limpiar Filtros
          </button>
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
                <th className="px-6 py-4 text-label-md text-on-surface-variant">Código</th>
                <th className="px-6 py-4 text-label-md text-on-surface-variant">Nombre</th>
                <th className="px-6 py-4 text-label-md text-on-surface-variant text-center">Stock</th>
                <th className="px-6 py-4 text-label-md text-on-surface-variant text-right">Precio Venta</th>
                <th className="px-6 py-4 text-label-md text-on-surface-variant text-right">Costo</th>
                <th className="px-6 py-4 text-label-md text-on-surface-variant text-center">Estado</th>
                <th className="px-6 py-4 text-label-md text-on-surface-variant text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {productos.length === 0 && !loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-on-surface-variant italic">
                    No se encontraron productos.
                  </td>
                </tr>
              ) : (
                productos.map((prod, index) => (
                  <tr 
                    key={`${prod.producto_id}-${prod.local_id}-${index}`} 
                    className={cn(
                      "hover:bg-surface-container-low transition-colors group",
                      !prod.activo && "opacity-60 bg-surface-variant/10"
                    )}
                  >
                    <td className="px-6 py-3 text-table-data tabular">{prod.codigo || '—'}</td>
                    <td className="px-6 py-3">
                      <div className="flex flex-col">
                        <span className="text-table-data font-semibold">{prod.nombre}</span>
                        {!activeLocalId && (
                          <span className="text-[10px] font-bold text-primary uppercase">{prod.local_nombre}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-table-data text-center">
                      <div className={cn(
                        "flex items-center justify-center gap-2 py-1 px-2 rounded-lg",
                        (prod.stock || 0) <= 5 ? "bg-error-container/20 text-error" : ""
                      )}>
                        {(prod.stock || 0) <= 5 && <AlertTriangle className="h-4 w-4" />}
                        <span className="font-bold tabular">{prod.stock || 0}</span>
                        <span className="text-on-surface-variant text-xs">{prod.unidad}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-table-data text-right font-medium tabular">{formatCurrency(prod.precio || 0)}</td>
                    <td className="px-6 py-3 text-table-data text-right text-on-surface-variant tabular">{formatCurrency(prod.costo || 0)}</td>
                    <td className="px-6 py-3 text-center">
                      <span className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                        prod.activo !== false ? "bg-secondary-container text-on-secondary-container" : "bg-surface-container-highest text-on-surface-variant"
                      )}>
                        {prod.activo !== false ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button 
                          onClick={() => navigate(`/productos/${prod.producto_id}`)}
                          className="p-2 text-primary hover:bg-primary-container/20 rounded-lg transition-all"
                          title="Ver detalle de stock"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => { setProductoEditar({ ...prod, id: prod.producto_id }); setFormOpen(true); }}
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
      </div>

      {/* Stats Grid at Bottom */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-outline-variant flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-primary-container/10 flex items-center justify-center text-primary">
            <Package className="h-6 w-6" />
          </div>
          <div>
            <p className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider">Total Productos</p>
            <p className="text-headline-sm font-bold">{stats.total}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-outline-variant flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-error-container/10 flex items-center justify-center text-error">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider">Bajo Stock</p>
            <p className="text-headline-sm font-bold text-error">{stats.bajoStock} ítems</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-outline-variant flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-secondary-container/10 flex items-center justify-center text-secondary">
            <Wrench className="h-6 w-6" />
          </div>
          <div>
            <p className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider">Servicios Activos</p>
            <p className="text-headline-sm font-bold">{stats.servicios}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Productos
