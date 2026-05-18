import React, { useState, useEffect, useMemo } from 'react'
import { X, Loader2 } from 'lucide-react'
import { cn } from '../../lib/utils'
import { supabase } from '../../lib/supabase'
import type { Producto } from '../../types'
import { Button } from '../ui/Button'
import { useLocal } from '../../contexts/LocalContext'

interface ProductoFormProps {
  open: boolean
  onClose: () => void
  onSuccess: (producto: Producto) => void
  productoInicial?: Partial<Producto>
}

const UNIDADES_SUGERIDAS = ['u.', 'kg', 'lt', 'm', 'serv.']

export const ProductoForm: React.FC<ProductoFormProps> = ({ open, onClose, onSuccess, productoInicial }) => {
  const { activeLocalId } = useLocal()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<Partial<Producto>>({
    codigo: '',
    nombre: '',
    descripcion: '',
    es_servicio: false,
    precio: 0,
    costo: 0,
    stock: 0,
    unidad: 'u.',
    activo: true
  })

  useEffect(() => {
    if (productoInicial) {
      setFormData({ ...formData, ...productoInicial })
    }
  }, [productoInicial])

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = 'unset' }
    }
  }, [open])

  const margen = useMemo(() => {
    if (!formData.precio || formData.precio === 0) return '0.0'
    const calc = ((formData.precio - (formData.costo || 0)) / formData.precio) * 100
    return calc.toFixed(1)
  }, [formData.precio, formData.costo])

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.nombre?.trim()) {
      setError('El nombre del producto es obligatorio')
      return
    }

    setLoading(true)

    try {
      // 1. Guardar datos básicos en tabla productos (sin stock)
      const productPayload = {
        codigo: formData.codigo || null,
        nombre: formData.nombre,
        descripcion: formData.descripcion || null,
        precio: formData.precio ?? 0,
        costo: formData.costo ?? 0,
        unidad: formData.unidad || 'u.',
        es_servicio: formData.es_servicio ?? false,
        activo: formData.activo ?? true,
      }

      let productData: any
      if (productoInicial?.id) {
        const { data: updated, error: updateError } = await supabase
          .from('productos')
          .update(productPayload)
          .eq('id', productoInicial.id)
          .select()
          .single()
        if (updateError) throw updateError
        productData = updated
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from('productos')
          .insert([productPayload])
          .select()
          .single()
        if (insertError) throw insertError
        productData = inserted
      }

      // 2. Gestionar Stock si no es servicio
      if (!formData.es_servicio) {
        // Determinar local: si estamos editando una fila que ya tenía local_id, usamos ese.
        // Si no (nuevo o sin local), usamos el activeLocalId o el local por defecto.
        const targetLocalId = (formData as any).local_id || activeLocalId || '00000000-0000-0000-0000-000000000001'
        
        if (targetLocalId) {
          const nuevoStock = formData.stock ?? 0
          const stockAnterior = productoInicial?.stock ?? 0

          if (!productoInicial?.id || nuevoStock !== stockAnterior) {
            // Upsert en stock_por_local
            const { error: stockError } = await supabase
              .from('stock_por_local')
              .upsert({
                producto_id: productData.id,
                local_id: targetLocalId,
                stock: nuevoStock
              }, { onConflict: 'producto_id,local_id' })
            
            if (stockError) throw stockError

            // Registrar en Kardex
            const { error: kardexError } = await supabase
              .from('movimientos_stock')
              .insert({
                producto_id: productData.id,
                local_id: targetLocalId,
                tipo: 'ajuste',
                cantidad: productoInicial?.id ? (nuevoStock - stockAnterior) : nuevoStock,
                stock_resultante: nuevoStock,
                descripcion: productoInicial?.id ? 'Ajuste manual de stock' : 'Stock inicial'
              })
            
            if (kardexError) throw kardexError
          }
        }
      }

      onSuccess(productData)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Error al guardar el producto')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant">
          <h3 className="text-headline-sm font-bold text-on-surface">
            {productoInicial?.id ? 'Editar Producto/Servicio' : 'Nuevo Producto/Servicio'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-surface-container rounded-full transition-colors">
            <X className="h-5 w-5 text-on-surface-variant" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-left">
          {error && (
            <div className="p-3 bg-error-container text-on-error-container text-body-sm rounded-lg border border-error/20">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider">Código / SKU</label>
              <input
                type="text"
                className="w-full border border-outline-variant rounded-lg px-3 py-2.5 text-body-md focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-surface"
                value={formData.codigo || ''}
                onChange={e => setFormData({ ...formData, codigo: e.target.value })}
              />
            </div>

            <div className="flex items-center gap-3 pt-6">
              <input
                id="es-servicio"
                type="checkbox"
                className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary"
                checked={formData.es_servicio}
                onChange={e => setFormData({ ...formData, es_servicio: e.target.checked, stock: e.target.checked ? 0 : formData.stock })}
              />
              <label htmlFor="es-servicio" className="text-body-md font-medium text-on-surface">Es un servicio</label>
            </div>

            <div className="md:col-span-2 space-y-1">
              <label className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider">Nombre *</label>
              <input
                type="text"
                required
                className="w-full border border-outline-variant rounded-lg px-3 py-2.5 text-body-md focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-surface font-semibold"
                value={formData.nombre}
                onChange={e => setFormData({ ...formData, nombre: e.target.value })}
              />
            </div>

            <div className="md:col-span-2 space-y-1">
              <label className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider">Descripción</label>
              <textarea
                rows={2}
                className="w-full border border-outline-variant rounded-lg px-3 py-2.5 text-body-md focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-surface resize-none"
                value={formData.descripcion || ''}
                onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider">Costo</label>
              <input
                type="number"
                step="0.01"
                className="w-full border border-outline-variant rounded-lg px-3 py-2.5 text-body-md focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-surface"
                value={formData.costo || 0}
                onChange={e => setFormData({ ...formData, costo: parseFloat(e.target.value) })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider">Precio de Venta</label>
              <input
                type="number"
                step="0.01"
                className="w-full border border-outline-variant rounded-lg px-3 py-2.5 text-body-md focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-surface font-bold text-primary"
                value={formData.precio || 0}
                onChange={e => setFormData({ ...formData, precio: parseFloat(e.target.value) })}
              />
            </div>

            <div className="md:col-span-2 flex items-center justify-between px-4 py-2 bg-surface-container-low rounded-xl border border-outline-variant">
              <span className="text-label-md font-bold text-on-surface-variant uppercase">Margen Calculado</span>
              <span className={cn(
                "text-headline-sm font-bold",
                parseFloat(margen) > 30 ? "text-secondary" : "text-tertiary"
              )}>{margen}%</span>
            </div>

            {!formData.es_servicio && (
              <div className="space-y-1 animate-in slide-in-from-top-2">
                <label className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider">
                  {productoInicial?.id ? `Ajustar Stock en ${(formData as any).local_nombre || 'Sucursal'}` : 'Stock Inicial'}
                </label>
                <input
                  type="number"
                  className="w-full border border-outline-variant rounded-lg px-3 py-2.5 text-body-md focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-surface font-bold"
                  value={formData.stock || 0}
                  onChange={e => setFormData({ ...formData, stock: parseFloat(e.target.value) || 0 })}
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider">Unidad</label>
              <select
                className="w-full border border-outline-variant rounded-lg px-3 py-2.5 text-body-md focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-surface"
                value={formData.unidad || 'u.'}
                onChange={e => setFormData({ ...formData, unidad: e.target.value })}
              >
                {UNIDADES_SUGERIDAS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-3 py-2">
              <input
                id="activo-prod"
                type="checkbox"
                className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary"
                checked={formData.activo}
                onChange={e => setFormData({ ...formData, activo: e.target.checked })}
              />
              <label htmlFor="activo-prod" className="text-body-md font-medium text-on-surface">Disponible para venta</label>
            </div>
          </div>
        </form>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-outline-variant">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="min-w-[120px]">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar Producto'}
          </Button>
        </div>
      </div>
    </div>
  )
}
