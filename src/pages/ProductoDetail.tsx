import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  Package, 
  ArrowLeft, 
  ArrowUpRight, 
  ArrowDownLeft, 
  History, 
  TrendingUp, 
  Loader2,
  AlertTriangle,
  Info,
  DollarSign,
  Store,
  Edit2
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { cn, formatCurrency, formatDatetime } from '../lib/utils'
import { Button } from '../components/ui/Button'
import { ProductoForm } from '../components/forms/ProductoForm'
import { useLocal } from '../contexts/LocalContext'

const ProductoDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { activeLocalId } = useLocal()
  const [loading, setLoading] = useState(true)
  const [producto, setProducto] = useState<any | null>(null)
  const [productoEditar, setProductoEditar] = useState<any | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [stockLocales, setStockLocales] = useState<any[]>([])
  const [movimientos, setMovimientos] = useState<any[]>([])

  const cargarDatos = async () => {
    if (!id) return
    setLoading(true)
    try {
      // 1. Obtener datos del producto y su stock en locales
      const { data: prod, error: prodError } = await supabase
        .from('productos')
        .select('*')
        .eq('id', id)
        .single()

      if (prodError) throw prodError
      setProducto(prod)

      // 2. Obtener stock por local
      const { data: stockData } = await supabase
        .from('vista_stock_por_local')
        .select('*')
        .eq('producto_id', id)
      
      setStockLocales(stockData || [])

      // 3. Obtener Movimientos desde la vista_kardex
      let query = supabase
        .from('vista_kardex')
        .select('*')
        .eq('producto_id', id)
      
      if (activeLocalId) {
        query = query.eq('local_id', activeLocalId)
      }

      const { data: kardex, error: kardexError } = await query
        .order('created_at', { ascending: false })

      if (kardexError) throw kardexError
      setMovimientos(kardex || [])
      
    } catch (error: any) {
      console.error('Error cargando detalle de producto:', error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarDatos()
  }, [id, activeLocalId])

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  if (!producto) return <div className="p-8 text-center text-error font-bold">Producto no encontrado.</div>

  const stockActual = activeLocalId 
    ? stockLocales.find(s => s.local_id === activeLocalId)?.stock || 0
    : stockLocales.reduce((acc, s) => acc + s.stock, 0)

  const margen = producto.costo > 0 ? ((producto.precio - producto.costo) / producto.costo) * 100 : 0

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/productos')} className="p-2 hover:bg-surface-container rounded-full text-on-surface-variant transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="w-14 h-14 rounded-2xl bg-primary-container flex items-center justify-center text-on-primary-container shadow-sm">
            <Package className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-headline-medium font-bold text-on-surface">{producto.nombre}</h2>
            <p className="text-body-sm text-on-surface-variant uppercase tracking-widest font-medium">Código: {producto.codigo || 'S/C'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" className="rounded-xl gap-2">Imprimir Etiquetas</Button>
          <Button 
            className="rounded-xl gap-2"
            onClick={() => setFormOpen(true)}
          >
            Editar Producto
          </Button>
        </div>
      </section>

      <ProductoForm 
        open={formOpen}
        onClose={() => { setFormOpen(false); setProductoEditar(null); }}
        onSuccess={() => { setFormOpen(false); setProductoEditar(null); cargarDatos(); }}
        productoInicial={productoEditar || {
          ...producto,
          stock: activeLocalId ? stockActual : 0,
          local_id: activeLocalId,
          local_nombre: activeLocalId ? stockLocales.find(s => s.local_id === activeLocalId)?.local_nombre : 'Sede Principal'
        }}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">        <div className="bg-white p-5 rounded-2xl border border-outline-variant shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-label-small font-bold text-on-surface-variant uppercase">Stock {activeLocalId ? 'Sucursal' : 'Total'}</span>
            <div className={cn(
               "p-1.5 rounded-lg",
               stockActual <= (producto.stock_minimo || 5) ? "bg-error-container text-error" : "bg-secondary-container text-secondary"
            )}>
              <Package className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-headline-medium font-black">{stockActual}</span>
            <span className="text-body-small text-on-surface-variant">{producto.unidad || 'uds'}</span>
          </div>
          {stockActual <= (producto.stock_minimo || 5) && (
            <div className="mt-2 flex items-center gap-1 text-[10px] text-error font-bold uppercase">
              <AlertTriangle className="h-3 w-3" /> Bajo Stock Mínimo
            </div>
          )}
        </div>

        <div className="bg-white p-5 rounded-2xl border border-outline-variant shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-label-small font-bold text-on-surface-variant uppercase">Precio Venta</span>
            <div className="p-1.5 bg-primary-container text-primary rounded-lg">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
          <span className="text-headline-medium font-black text-primary">{formatCurrency(producto.precio)}</span>
          <p className="text-[10px] text-on-surface-variant mt-1 uppercase font-bold">Consumidor Final</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-outline-variant shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-label-small font-bold text-on-surface-variant uppercase">Costo Reposición</span>
            <div className="p-1.5 bg-surface-container-highest text-on-surface-variant rounded-lg">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <span className="text-headline-medium font-black text-on-surface">{formatCurrency(producto.costo)}</span>
          <p className="text-[10px] text-on-surface-variant mt-1 uppercase font-bold">Última Compra</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-outline-variant shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-label-small font-bold text-on-surface-variant uppercase">Rentabilidad</span>
            <div className="p-1.5 bg-secondary-container text-secondary rounded-lg">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <span className="text-headline-medium font-black text-secondary">%{margen.toFixed(1)}</span>
          <p className="text-[10px] text-on-surface-variant mt-1 uppercase font-bold">Margen sobre costo</p>
        </div>
      </div>

      {/* Stock por Sucursal */}
      {!activeLocalId && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-3xl p-6 space-y-4">
          <h3 className="text-title-medium font-bold flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" /> Disponibilidad por Sucursal
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {stockLocales.map(s => (
              <div key={s.local_id} className="p-4 bg-white rounded-2xl border border-outline-variant flex flex-col items-center text-center group relative">
                <span className="text-label-small text-on-surface-variant font-bold uppercase">{s.local_nombre}</span>
                <span className={cn(
                  "text-headline-small font-black mt-1",
                  s.stock <= (producto.stock_minimo || 5) ? "text-error" : "text-on-surface"
                )}>
                  {s.stock}
                </span>
                <span className="text-[10px] text-on-surface-variant uppercase mb-2">{producto.unidad || 'uds'}</span>
                <button 
                  onClick={() => {
                    setProductoEditar({
                      ...producto,
                      stock: s.stock,
                      local_id: s.local_id,
                      local_nombre: s.local_nombre
                    });
                    setFormOpen(true);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-2 right-2 p-1.5 text-primary hover:bg-primary/10 rounded-lg"
                  title="Ajustar stock en este local"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cardex / Movements Table */}
      <div className="bg-white border border-outline-variant rounded-3xl shadow-sm overflow-hidden flex flex-col">
        <div className="px-8 py-6 border-b border-outline-variant flex items-center justify-between bg-surface-container-low">
          <div className="flex items-center gap-3">
            <History className="h-6 w-6 text-secondary" />
            <h3 className="text-title-large font-bold">Balance de Stock (Kárdex) {activeLocalId && '— Sucursal Seleccionada'}</h3>
          </div>
          <div className="flex gap-2">
             <div className="flex items-center gap-1.5 px-3 py-1.5 bg-success/10 text-success rounded-lg text-xs font-bold uppercase">
               <ArrowDownLeft className="h-3.5 w-3.5" /> Entradas
             </div>
             <div className="flex items-center gap-1.5 px-3 py-1.5 bg-error/10 text-error rounded-lg text-xs font-bold uppercase">
               <ArrowUpRight className="h-3.5 w-3.5" /> Salidas
             </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-surface-container-lowest border-b border-outline-variant">
                <th className="px-8 py-4 text-label-medium text-on-surface-variant uppercase">Fecha / Hora</th>
                <th className="px-8 py-4 text-label-medium text-on-surface-variant uppercase">Sede</th>
                <th className="px-8 py-4 text-label-medium text-on-surface-variant uppercase">Descripción</th>
                <th className="px-8 py-4 text-label-medium text-on-surface-variant uppercase text-right">Entrada</th>
                <th className="px-8 py-4 text-label-medium text-on-surface-variant uppercase text-right">Salida</th>
                <th className="px-8 py-4 text-label-medium text-on-surface-variant uppercase text-right">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {movimientos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-12 text-center text-on-surface-variant italic">
                    No se registran movimientos para este producto.
                  </td>
                </tr>
              ) : (
                movimientos.map((m) => (
                  <tr key={m.id} className="hover:bg-surface-container-lowest transition-colors group">
                    <td className="px-8 py-4 text-body-md tabular whitespace-nowrap">{formatDatetime(m.created_at)}</td>
                    <td className="px-8 py-4">
                      <span className="px-2 py-1 rounded-md bg-surface-container text-[10px] font-bold uppercase">
                        {m.local_nombre}
                      </span>
                    </td>
                    <td className="px-8 py-4 text-body-md text-on-surface">{m.descripcion}</td>
                    <td className="px-8 py-4 text-right">
                      {m.cantidad > 0 ? (
                        <span className="text-success font-black text-body-lg">+{m.cantidad}</span>
                      ) : '—'}
                    </td>
                    <td className="px-8 py-4 text-right">
                      {m.cantidad < 0 ? (
                        <span className="text-error font-black text-body-lg">{m.cantidad}</span>
                      ) : '—'}
                    </td>
                    <td className="px-8 py-4 text-right">
                      <span className="px-3 py-1 bg-surface-container-highest rounded-lg font-black tabular">
                        {m.stock_resultante}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Help footer */}
        <div className="px-8 py-4 bg-surface-container-low border-t border-outline-variant flex items-center gap-2 text-body-small text-on-surface-variant italic">
          <Info className="h-4 w-4" />
          El saldo histórico se calcula en base a todos los movimientos registrados en el sistema.
        </div>
      </div>
    </div>
  )
}

export default ProductoDetail
