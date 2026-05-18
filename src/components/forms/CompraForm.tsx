import React, { useState, useEffect, useMemo } from 'react'
import { X, Loader2, Plus, Trash2, Truck, Package, ShoppingBag } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Proveedor, CompraItem } from '../../types'
import { Button } from '../ui/Button'
import { formatCurrency } from '../../lib/utils'
import { useLocal } from '../../contexts/LocalContext'

interface CompraFormProps {
  open: boolean
  onClose: () => void
  onSuccess: (compra: any) => void
  proveedorPreseleccionado?: Proveedor | null
}

export const CompraForm: React.FC<CompraFormProps> = ({ 
  open, 
  onClose, 
  onSuccess,
  proveedorPreseleccionado 
}) => {
  const { activeLocalId, locales } = useLocal()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Header State
  const [proveedor, setProveedor] = useState<Proveedor | null>(null)
  const [searchProveedor, setSearchProveedor] = useState('')
  const [proveedoresSugeridos, setProveedoresSugeridos] = useState<Proveedor[]>([])
  const [showProveedores, setShowProveedores] = useState(false)
  
  const [fecha] = useState(new Date().toISOString().split('T')[0])
  const [tipoComprobante, setTipoComprobante] = useState('Factura C')
  const [numeroFactura, setNumeroFactura] = useState('')
  const [localId, setLocalId] = useState(activeLocalId || '')
  const [notas, setNotas] = useState('')

  // Items State
  const [items, setItems] = useState<Partial<CompraItem & { temp_producto?: any }>[]>([
    { cantidad: 1, precio_unitario: 0, subtotal: 0, descripcion: '' }
  ])

  
  // Product Search State
  const [activeProductSearch, setActiveProductSearch] = useState<number | null>(null)
  const [productosSugeridos, setProductosSugeridos] = useState<any[]>([])
  const [productSearchTerm, setProductSearchTerm] = useState('')

  const total = useMemo(() => {
    return items.reduce((acc, item) => acc + (item.subtotal || 0), 0)
  }, [items])

  // Debounced Supplier Search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchProveedor.trim().length < 2) {
        setProveedoresSugeridos([])
        return
      }
      const { data } = await supabase
        .from('proveedores')
        .select('*')
        .ilike('razon_social', `%${searchProveedor}%`)
        .limit(10)
      setProveedoresSugeridos(data || [])
    }, 300)
    return () => clearTimeout(timer)
  }, [searchProveedor])

  // Debounced Product Search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!productSearchTerm || productSearchTerm.length < 2) {
        setProductosSugeridos([])
        return
      }
      const { data } = await supabase
        .from('productos')
        .select('*')
        .or(`nombre.ilike.%${productSearchTerm}%,codigo.ilike.%${productSearchTerm}%`)
        .eq('activo', true)
        .limit(6)
      setProductosSugeridos(data || [])
    }, 300)
    return () => clearTimeout(timer)
  }, [productSearchTerm])

  useEffect(() => {
    if (activeLocalId && !localId) setLocalId(activeLocalId)
  }, [activeLocalId])

  useEffect(() => {
    if (open) {
      setError(null)
      setItems([{ cantidad: 1, precio_unitario: 0, subtotal: 0, descripcion: '' }])
      setNumeroFactura('')
      setNotas('')
      if (proveedorPreseleccionado) {
        setProveedor(proveedorPreseleccionado)
      } else {
        setProveedor(null)
      }
    }
  }, [open, proveedorPreseleccionado])

  const addItem = () => {
    setItems([...items, { cantidad: 1, precio_unitario: 0, subtotal: 0, descripcion: '' }])
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: keyof CompraItem, value: any) => {
    const newItems = [...items]
    const item = { ...newItems[index], [field]: value }
    
    // Recalcular subtotal del item
    const cantidad = item.cantidad || 0
    const costo = item.precio_unitario || 0
    item.subtotal = cantidad * costo
    
    newItems[index] = item
    setItems(newItems)
  }

  const selectProducto = (index: number, prod: any) => {
    const newItems = [...items]
    newItems[index] = {
      ...newItems[index],
      producto_id: prod.id,
      descripcion: prod.nombre,
      precio_unitario: prod.costo || 0,
      subtotal: (newItems[index].cantidad || 1) * (prod.costo || 0)
    }
    setItems(newItems)
    setActiveProductSearch(null)
    setProductSearchTerm('')
    setProductosSugeridos([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!proveedor) { setError('Selecciona un proveedor'); return }
    if (!localId) { setError('Selecciona un local para recibir el stock'); return }
    if (items.length === 0 || !items[0].producto_id) { setError('Agrega al menos un producto'); return }

    setError(null)
    setLoading(true)

    try {
      // 1. Insert Compra (se inserta como confirmada para que el trigger de stock funcione)
      const { data: compra, error: compraError } = await supabase
        .from('compras')
        .insert([{
          proveedor_id: proveedor.id,
          local_id: localId,
          tipo_comprobante: tipoComprobante,
          nro_comprobante: numeroFactura || null,
          fecha,
          subtotal: total,
          total,
          saldo_pendiente: total,
          estado: 'recibida',
          notas
        }])
        .select()
        .single()

      if (compraError) throw compraError

      // 2. Insert Items
      const itemsToInsert = items.map(item => ({
        compra_id: compra.id,
        producto_id: item.producto_id,
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        costo_unitario: item.precio_unitario,
        subtotal: item.subtotal
      }))

      const { error: itemsError } = await supabase
        .from('compra_items')
        .insert(itemsToInsert)

      if (itemsError) throw itemsError

      onSuccess(compra)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Error al guardar la compra')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant">
          <h3 className="text-headline-sm font-bold text-on-surface flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-primary" />
            Nueva Factura de Compra
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-surface-container rounded-full transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-8">
          {error && <div className="p-3 bg-error-container text-on-error-container rounded-lg">{error}</div>}

          {/* Header Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 bg-surface-container-lowest p-5 rounded-xl border border-outline-variant">
            <div className="md:col-span-1 space-y-1 relative">
              <label className="text-label-sm font-bold text-on-surface-variant uppercase tracking-wider">Proveedor</label>
              {proveedor ? (
                <div className="flex items-center justify-between p-2.5 bg-primary/5 border border-primary/20 rounded-lg">
                  <div className="flex flex-col">
                    <span className="text-body-md font-bold text-primary">{proveedor.razon_social}</span>
                    <span className="text-xs text-on-surface-variant">CUIT: {proveedor.cuit || '—'}</span>
                  </div>
                  <button type="button" onClick={() => setProveedor(null)} className="text-on-surface-variant hover:text-error p-1">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Truck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-outline" />
                  <input
                    type="text"
                    placeholder="Buscar proveedor..."
                    className="w-full pl-10 pr-4 py-2 border border-outline-variant rounded-lg text-body-md focus:ring-2 focus:ring-primary"
                    value={searchProveedor}
                    onChange={e => { setSearchProveedor(e.target.value); setShowProveedores(true); }}
                  />
                  {showProveedores && proveedoresSugeridos.length > 0 && (
                    <div className="absolute top-full left-0 w-full bg-white border border-outline-variant rounded-xl shadow-xl mt-1 z-[60] max-h-48 overflow-y-auto">
                      {proveedoresSugeridos.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          className="w-full px-4 py-2 text-left hover:bg-surface-container-low flex flex-col border-b border-outline-variant last:border-0"
                          onClick={() => { setProveedor(p); setShowProveedores(false); setSearchProveedor(''); }}
                        >
                          <div className="flex justify-between items-center w-full">
                            <span className="font-bold text-body-md">{p.razon_social}</span>
                            {!p.activo && <span className="px-1.5 py-0.5 bg-error-container text-on-error-container text-[8px] font-bold rounded uppercase">Inactivo</span>}
                          </div>
                          <span className="text-[10px] uppercase text-on-surface-variant">CUIT: {p.cuit || '—'}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-label-sm font-bold text-on-surface-variant uppercase tracking-wider">Tipo Comprobante</label>
              <select 
                className="w-full border border-outline-variant rounded-lg p-2 text-body-md bg-white"
                value={tipoComprobante}
                onChange={e => setTipoComprobante(e.target.value)}
              >
                <option>Factura A</option>
                <option>Factura B</option>
                <option>Factura C</option>
                <option>Remito</option>
                <option>Ticket</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-label-sm font-bold text-on-surface-variant uppercase tracking-wider">Nro Comprobante</label>
              <input 
                type="text" 
                placeholder="0001-00001234"
                className="w-full border border-outline-variant rounded-lg p-2 text-body-md" 
                value={numeroFactura} 
                onChange={e => setNumeroFactura(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-label-sm font-bold text-on-surface-variant uppercase tracking-wider">Local Destino</label>
              <select 
                className="w-full border border-outline-variant rounded-lg p-2 text-body-md bg-white"
                value={localId}
                onChange={e => setLocalId(e.target.value)}
              >
                <option value="">Seleccionar local...</option>
                {locales.map(l => (
                  <option key={l.id} value={l.id}>{l.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Items Section */}
          <div className="space-y-4">
            <h4 className="text-label-md font-bold text-on-surface uppercase tracking-widest border-b border-outline-variant pb-2">Productos a Recibir</h4>
            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-3 items-end bg-surface p-4 rounded-xl border border-outline-variant group transition-all hover:border-primary/30">
                  <div className="col-span-5 space-y-1 relative">
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase">Producto</label>
                    <div className="relative">
                      <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-outline" />
                      <input
                        type="text"
                        placeholder="Buscar en catálogo..."
                        className="w-full pl-10 pr-4 py-2 border border-outline-variant rounded-lg text-body-sm focus:ring-2 focus:ring-primary"
                        value={item.descripcion}
                        onChange={e => {
                          updateItem(idx, 'descripcion', e.target.value);
                          setProductSearchTerm(e.target.value);
                          setActiveProductSearch(idx);
                        }}
                      />
                      {activeProductSearch === idx && productosSugeridos.length > 0 && (
                        <div className="absolute top-full left-0 w-full bg-white border border-outline-variant rounded-xl shadow-2xl mt-1 z-[70] max-h-60 overflow-y-auto">
                          {productosSugeridos.map(p => (
                            <button
                              key={p.id}
                              type="button"
                              className="w-full px-4 py-2.5 text-left hover:bg-primary/5 flex flex-col border-b border-outline-variant last:border-0 group"
                              onClick={() => selectProducto(idx, p)}
                            >
                              <div className="flex justify-between items-start">
                                <span className="font-bold text-body-sm text-on-surface group-hover:text-primary">{p.nombre}</span>
                                <span className="text-[10px] font-bold tabular text-on-surface-variant">Costo Ref: {formatCurrency(p.costo || 0)}</span>
                              </div>
                              <span className="text-[10px] uppercase text-on-surface-variant">Código: {p.codigo || '—'}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase">Cant.</label>
                    <input
                      type="number"
                      step="any"
                      className="w-full border border-outline-variant rounded-lg p-2 text-body-sm text-center font-bold"
                      value={item.cantidad}
                      onChange={e => updateItem(idx, 'cantidad', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase">Costo Unit.</label>
                    <input
                      type="number"
                      step="any"
                      className="w-full border border-outline-variant rounded-lg p-2 text-body-sm text-right"
                      value={item.precio_unitario}
                      onChange={e => updateItem(idx, 'precio_unitario', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase">Subtotal</label>
                    <div className="w-full p-2 bg-surface-container-low rounded-lg text-body-sm text-right font-bold tabular">
                      {formatCurrency(item.subtotal || 0)}
                    </div>
                  </div>
                  <div className="col-span-1 text-center pb-1">
                    <button type="button" onClick={() => removeItem(idx)} className="p-2 text-outline hover:text-error transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" onClick={addItem} className="flex items-center gap-2 text-primary font-bold text-label-md hover:bg-primary/5 px-4 py-2 rounded-lg transition-all">
              <Plus className="h-4 w-4" /> Agregar Ítem
            </button>
          </div>

          {/* Footer Totals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start pt-6 border-t border-outline-variant">
            <div className="space-y-1">
              <label className="text-label-sm font-bold text-on-surface-variant uppercase">Notas / Observaciones</label>
              <textarea 
                rows={3} 
                className="w-full border border-outline-variant rounded-xl p-3 text-body-sm resize-none" 
                value={notas}
                onChange={e => setNotas(e.target.value)}
                placeholder="Ej: Entrega parcial, factura pendiente de pago, etc."
              />
            </div>
            <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10 flex flex-col items-end">
              <span className="text-label-md font-bold text-primary uppercase tracking-widest">Total Compra</span>
              <span className="text-headline-lg font-bold text-primary tabular tracking-tighter">
                {formatCurrency(total)}
              </span>
            </div>
          </div>
        </form>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-outline-variant bg-surface-container-low">
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading} className="min-w-[180px] shadow-lg shadow-primary/20">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar Ingreso'}
          </Button>
        </div>
      </div>
    </div>
  )
}
