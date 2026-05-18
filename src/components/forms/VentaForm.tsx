import React, { useState, useEffect, useMemo } from 'react'
import { X, Loader2, Search, Plus, Trash2, User, CheckCircle2, Ban, ArrowRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Cliente, Venta, VentaItem } from '../../types'
import { Button } from '../ui/Button'
import { cn, formatCurrency } from '../../lib/utils'
import { useLocal } from '../../contexts/LocalContext'

interface VentaFormProps {
  open: boolean
  onClose: () => void
  onSuccess: (venta: Venta) => void
  clientePreseleccionado?: Cliente
}

export const VentaForm: React.FC<VentaFormProps> = ({ open, onClose, onSuccess, clientePreseleccionado }) => {
  const { activeLocalId } = useLocal()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedVenta, setSavedVenta] = useState<Venta | null>(null)
  
  // Header State
  const [cliente, setCliente] = useState<Cliente | null>(clientePreseleccionado || null)
  const [searchCliente, setSearchCliente] = useState('')
  const [clientesSugeridos, setClientesSugeridos] = useState<Cliente[]>([])
  const [showClientes, setShowClientes] = useState(false)
  
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [fechaEntrega, setFechaEntrega] = useState('')
  const [notas, setNotas] = useState('')

  // Items State
  const [items, setItems] = useState<Partial<VentaItem & { temp_producto?: any }>[]>([
    { cantidad: 1, precio_unitario: 0, descuento: 0, subtotal: 0, descripcion: '' }
  ])
  
  // Product Search State
  const [activeProductSearch, setActiveProductSearch] = useState<number | null>(null)
  const [productosSugeridos, setProductosSugeridos] = useState<any[]>([])
  const [productSearchTerm, setProductSearchTerm] = useState('')

  // Totals Calculation
  const [descuentoGlobal, setDescuentoGlobal] = useState(0)

  const totals = useMemo(() => {
    const subtotal = items.reduce((acc, item) => acc + (item.subtotal || 0), 0)
    const total = subtotal * (1 - descuentoGlobal / 100)
    return { subtotal, total }
  }, [items, descuentoGlobal])

  // Debounced Client Search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchCliente.trim().length < 2) {
        setClientesSugeridos([])
        return
      }
      const { data } = await supabase
        .from('clientes')
        .select('*')
        .ilike('razon_social', `%${searchCliente}%`)
        .limit(5)
      setClientesSugeridos((data || []) as Cliente[])
    }, 300)
    return () => clearTimeout(timer)
  }, [searchCliente])

  // Debounced Product Search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!productSearchTerm || productSearchTerm.length < 2) {
        setProductosSugeridos([])
        return
      }
      // Buscamos en productos directamente para asegurar que traiga el precio
      let query = supabase
        .from('productos')
        .select(`
          producto_id:id,
          nombre,
          codigo,
          precio,
          unidad,
          es_servicio,
          stock_por_local!left(stock)
        `)
        .eq('activo', true)
        .or(`nombre.ilike.%${productSearchTerm}%,codigo.ilike.%${productSearchTerm}%`)
        .limit(6)
      
      if (activeLocalId) {
        query = query.eq('stock_por_local.local_id', activeLocalId)
      }

      const { data, error } = await query
      if (error) {
        console.error('Error buscando productos:', error)
        return
      }

      // Mapear para que el stock sea un valor directo y no un array
      const mappedData = data?.map(p => ({
        ...p,
        stock: p.stock_por_local?.[0]?.stock || 0
      }))

      setProductosSugeridos(mappedData || [])
    }, 300)
    return () => clearTimeout(timer)
  }, [productSearchTerm, activeLocalId])

  const addItem = () => {
    setItems([...items, { cantidad: 1, precio_unitario: 0, descuento: 0, subtotal: 0, descripcion: '' }])
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: keyof VentaItem, value: any) => {
    const newItems = [...items]
    const item = { ...newItems[index], [field]: value }
    
    // Recalcular subtotal del item
    const cantidad = item.cantidad || 0
    const precio = item.precio_unitario || 0
    const desc = item.descuento || 0
    item.subtotal = cantidad * precio * (1 - desc / 100)
    
    newItems[index] = item
    setItems(newItems)
  }

  const selectProducto = (index: number, prod: any) => {
    const newItems = [...items]
    const currentItem = newItems[index]
    
    const cantidad = parseFloat(currentItem.cantidad?.toString() || '1')
    const precio = parseFloat(prod.precio?.toString() || '0')
    const descuento = parseFloat(currentItem.descuento?.toString() || '0')
    
    newItems[index] = {
      ...currentItem,
      producto_id: prod.producto_id,
      descripcion: prod.nombre,
      precio_unitario: precio,
      subtotal: cantidad * precio * (1 - descuento / 100)
    }
    
    setItems(newItems)
    setActiveProductSearch(null)
    setProductSearchTerm('')
    setProductosSugeridos([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!activeLocalId) {
      setError('Debes seleccionar un local antes de generar una venta.')
      return
    }

    setError(null)
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      // 1. Insert Venta
      const { data: venta, error: ventaError } = await supabase
        .from('ventas')
        .insert([{
          cliente_id: cliente?.id || null,
          vendedor_id: user?.id,
          local_id: activeLocalId,
          estado: 'presupuesto',
          fecha,
          fecha_entrega: fechaEntrega || null,
          subtotal: totals.subtotal,
          descuento: (totals.subtotal * descuentoGlobal) / 100,
          total: totals.total,
          saldo_pendiente: totals.total,
          notas
        }])
        .select()
        .single()

      if (ventaError) throw ventaError

      // 2. Insert Items
      const itemsToInsert = items.map(item => ({
        venta_id: venta.id,
        producto_id: item.producto_id || null,
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        descuento: ((item.precio_unitario || 0) * (item.descuento || 0)) / 100,
        subtotal: item.subtotal
      }))

      const { error: itemsError } = await supabase
        .from('venta_items')
        .insert(itemsToInsert)

      if (itemsError) throw itemsError
 
      setSavedVenta(venta)
    } catch (err: any) {
      setError(err.message || 'Error al guardar la venta')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmDirect = async () => {
    if (!savedVenta) return
    setLoading(true)
    try {
      const { error } = await supabase
        .from('ventas')
        .update({ estado: 'confirmado' })
        .eq('id', savedVenta.id)
      
      if (error) throw error
      onSuccess({ ...savedVenta, estado: 'confirmado' })
      onClose()
    } catch (err: any) {
      setError(err.message || 'Error al confirmar la venta')
    } finally {
      setLoading(false)
    }
  }

  const handleAnularDirect = async () => {
    if (!savedVenta) return
    if (!window.confirm('¿Deseas anular esta venta recién creada?')) return
    
    setLoading(true)
    try {
      const { error } = await supabase
        .from('ventas')
        .update({ estado: 'cancelado' })
        .eq('id', savedVenta.id)
      
      if (error) throw error
      onSuccess({ ...savedVenta, estado: 'cancelado' })
      onClose()
    } catch (err: any) {
      setError(err.message || 'Error al anular la venta')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-200">
        {savedVenta ? (
          <div className="p-12 flex flex-col items-center text-center space-y-6">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="text-headline-md font-bold text-on-surface">¡Presupuesto Generado!</h3>
              <p className="text-body-lg text-on-surface-variant">
                Venta <b>V-{savedVenta.numero.toString().padStart(7, '0')}</b> por <b>{formatCurrency(savedVenta.total)}</b>
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-md pt-6">
              <Button 
                onClick={handleConfirmDirect} 
                disabled={loading}
                className="h-16 text-lg"
              >
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : 'Confirmar Venta'}
              </Button>
              
              <Button 
                variant="secondary" 
                onClick={() => {
                  onSuccess(savedVenta)
                  onClose()
                  window.location.href = `/ventas/${savedVenta.id}`
                }}
                className="h-16"
              >
                <ArrowRight className="h-5 w-5 mr-2" /> Ver Detalle
              </Button>

              <Button 
                variant="ghost" 
                onClick={handleAnularDirect}
                disabled={loading}
                className="text-error hover:bg-error/5 h-12"
              >
                <Ban className="h-4 w-4 mr-2" /> Anular Venta
              </Button>

              <Button 
                variant="ghost" 
                onClick={() => {
                  onSuccess(savedVenta)
                  onClose()
                }}
                className="h-12"
              >
                Finalizar
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant">
              <h3 className="text-headline-sm font-bold text-on-surface">Nueva Venta (Presupuesto)</h3>
              <button onClick={onClose} className="p-2 hover:bg-surface-container rounded-full transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-8">
              {error && <div className="p-3 bg-error-container text-on-error-container rounded-lg">{error}</div>}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-surface-container-lowest p-4 rounded-xl border border-outline-variant">
            <div className="md:col-span-1 space-y-1 relative">
              <label className="text-label-sm font-bold text-on-surface-variant uppercase tracking-wider">Cliente</label>
              {cliente ? (
                <div className="flex items-center justify-between p-2.5 bg-primary/5 border border-primary/20 rounded-lg">
                  <div className="flex flex-col">
                    <span className="text-body-md font-bold text-primary">{cliente.razon_social}</span>
                    <span className="text-xs text-on-surface-variant">CUIT: {cliente.cuit || '—'}</span>
                  </div>
                  {!clientePreseleccionado && (
                    <button type="button" onClick={() => setCliente(null)} className="text-on-surface-variant hover:text-error p-1">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-outline" />
                    <input
                      type="text"
                      placeholder="Buscar cliente..."
                      className="w-full pl-10 pr-4 py-2 border border-outline-variant rounded-lg text-body-md focus:ring-2 focus:ring-primary"
                      value={searchCliente}
                      onChange={e => { setSearchCliente(e.target.value); setShowClientes(true); }}
                    />
                  </div>
                  {showClientes && clientesSugeridos.length > 0 && (
                    <div className="absolute top-full left-0 w-full bg-white border border-outline-variant rounded-xl shadow-xl mt-1 z-[60] max-h-48 overflow-y-auto">
                      {clientesSugeridos.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          className="w-full px-4 py-2 text-left hover:bg-surface-container-low flex flex-col border-b border-outline-variant last:border-0"
                          onClick={() => { setCliente(c); setShowClientes(false); setSearchCliente(''); }}
                        >
                          <span className="font-bold text-body-md">{c.razon_social}</span>
                          <span className="text-[10px] uppercase text-on-surface-variant">CUIT: {c.cuit || '—'}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <button 
                    type="button" 
                    onClick={() => setCliente({ razon_social: 'Consumidor Final', id: undefined } as any)}
                    className="text-[10px] text-primary font-bold uppercase mt-1 hover:underline flex items-center gap-1"
                  >
                    <User className="h-3 w-3" /> Usar Consumidor Final
                  </button>
                </>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-label-sm font-bold text-on-surface-variant uppercase tracking-wider">Fecha</label>
              <input 
                type="date" 
                className="w-full border border-outline-variant rounded-lg p-2 text-body-md" 
                value={fecha} 
                onChange={e => setFecha(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-label-sm font-bold text-on-surface-variant uppercase tracking-wider">Fecha Entrega</label>
              <input 
                type="date" 
                className="w-full border border-outline-variant rounded-lg p-2 text-body-md" 
                value={fechaEntrega} 
                onChange={e => setFechaEntrega(e.target.value)}
              />
            </div>
          </div>

          {/* Items Section */}
          <div className="space-y-4">
            <h4 className="text-label-md font-bold text-on-surface uppercase tracking-widest border-b border-outline-variant pb-2">Ítems de Venta</h4>
            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-3 items-end bg-surface p-3 rounded-xl border border-outline-variant group animate-in slide-in-from-left-2">
                  <div className="col-span-5 space-y-1 relative">
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase">Producto / Descripción</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Producto o descripción libre..."
                        className={cn(
                          "w-full border border-outline-variant rounded-lg p-2 text-body-sm transition-all",
                          activeProductSearch === idx && "ring-2 ring-primary border-primary"
                        )}
                        value={item.descripcion}
                        onChange={e => {
                          updateItem(idx, 'descripcion', e.target.value);
                          setProductSearchTerm(e.target.value);
                          setActiveProductSearch(idx);
                        }}
                        onFocus={() => {
                          setActiveProductSearch(idx);
                          setProductSearchTerm(item.descripcion || '');
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
                                <span className="text-[10px] font-bold tabular text-primary">{formatCurrency(p.precio)}</span>
                              </div>
                              <div className="flex gap-2">
                                <span className="text-[10px] uppercase text-on-surface-variant">Código: {p.codigo || '—'}</span>
                                {!p.es_servicio && (
                                  <span className={cn(
                                    "text-[10px] font-semibold",
                                    (p.stock || 0) <= 5 ? "text-error" : "text-secondary"
                                  )}>
                                    Stock: {p.stock} {p.unidad}
                                  </span>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="col-span-1 space-y-1">
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase">Cant.</label>
                    <input
                      type="number"
                      step="any"
                      className="w-full border border-outline-variant rounded-lg p-2 text-body-sm text-center"
                      value={item.cantidad}
                      onChange={e => updateItem(idx, 'cantidad', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase">Precio Unit.</label>
                    <input
                      type="number"
                      step="any"
                      className="w-full border border-outline-variant rounded-lg p-2 text-body-sm text-right"
                      value={item.precio_unitario}
                      onChange={e => updateItem(idx, 'precio_unitario', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-1 space-y-1">
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase">Desc. %</label>
                    <input
                      type="number"
                      step="any"
                      className="w-full border border-outline-variant rounded-lg p-2 text-body-sm text-center"
                      value={item.descuento}
                      onChange={e => updateItem(idx, 'descuento', parseFloat(e.target.value) || 0)}
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
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-label-sm font-bold text-on-surface-variant uppercase">Notas de Venta</label>
                <textarea 
                  rows={3} 
                  className="w-full border border-outline-variant rounded-xl p-3 text-body-sm resize-none" 
                  value={notas}
                  onChange={e => setNotas(e.target.value)}
                />
              </div>
            </div>
            <div className="bg-surface-container-highest p-6 rounded-2xl space-y-3 shadow-inner">
              <div className="flex justify-between text-body-md text-on-surface-variant">
                <span>Subtotal</span>
                <span className="font-bold tabular">{formatCurrency(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between items-center text-body-md text-on-surface-variant">
                <span>Descuento Global %</span>
                <input 
                  type="number" 
                  step="any"
                  className="w-20 border border-outline-variant rounded px-2 py-1 text-right font-bold"
                  value={descuentoGlobal}
                  onChange={e => setDescuentoGlobal(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="h-px bg-outline-variant my-2"></div>
              <div className="flex justify-between items-end">
                <span className="text-headline-sm font-bold text-on-surface">TOTAL</span>
                <span className="text-headline-md font-bold text-primary tabular tracking-tighter">
                  {formatCurrency(totals.total)}
                </span>
              </div>
            </div>
          </div>
        </form>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-outline-variant bg-surface-container-low">
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading} className="min-w-[160px] shadow-lg shadow-primary/20">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Generar Presupuesto'}
          </Button>
        </div>
      </>
    )}
  </div>
</div>
  )
}
