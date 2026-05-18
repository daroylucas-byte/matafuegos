import React, { useState, useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Proveedor } from '../../types'
import { Button } from '../ui/Button'

interface ProveedorFormProps {
  open: boolean
  onClose: () => void
  onSuccess: (proveedor: Proveedor) => void
  proveedorInicial?: Partial<Proveedor>
}

export const ProveedorForm: React.FC<ProveedorFormProps> = ({ open, onClose, onSuccess, proveedorInicial }) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<Partial<Proveedor>>({
    razon_social: '',
    nombre_fantasia: '',
    cuit: '',
    email: '',
    telefono: '',
    direccion: '',
    localidad: '',
    notas: '',
    activo: true
  })

  useEffect(() => {
    if (proveedorInicial) {
      setFormData({ ...formData, ...proveedorInicial })
    }
  }, [proveedorInicial])

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose()
      }
      window.addEventListener('keydown', handleEsc)
      return () => {
        document.body.style.overflow = 'unset'
        window.removeEventListener('keydown', handleEsc)
      }
    }
  }, [open, onClose])

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.razon_social?.trim()) {
      setError('La Razón Social es obligatoria')
      return
    }

    setLoading(true)

    const payload = {
      razon_social: formData.razon_social,
      nombre_fantasia: formData.nombre_fantasia || null,
      cuit: formData.cuit || null,
      email: formData.email || null,
      telefono: formData.telefono || null,
      direccion: formData.direccion || null,
      localidad: formData.localidad || null,
      notas: formData.notas || null,
      activo: formData.activo ?? true,
    }

    try {
      let data, error
      if (proveedorInicial?.id) {
        const { data: updated, error: updateError } = await supabase
          .from('proveedores')
          .update(payload)
          .eq('id', proveedorInicial.id)
          .select()
          .single()
        data = updated
        error = updateError
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from('proveedores')
          .insert([payload])
          .select()
          .single()
        data = inserted
        error = insertError
      }

      if (error) throw error
      onSuccess(data)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Error al guardar el proveedor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant">
          <h3 className="text-headline-sm font-bold text-on-surface">
            {proveedorInicial?.id ? 'Editar Proveedor' : 'Nuevo Proveedor'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-surface-container rounded-full transition-colors">
            <X className="h-5 w-5 text-on-surface-variant" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 bg-error-container text-on-error-container text-body-sm rounded-lg border border-error/20">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-1">
              <label className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider">Razón Social *</label>
              <input
                autoFocus
                type="text"
                required
                className="w-full border border-outline-variant rounded-lg px-3 py-2.5 text-body-md focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-surface"
                value={formData.razon_social}
                onChange={e => setFormData({ ...formData, razon_social: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider">Nombre Fantasía</label>
              <input
                type="text"
                className="w-full border border-outline-variant rounded-lg px-3 py-2.5 text-body-md focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-surface"
                value={formData.nombre_fantasia || ''}
                onChange={e => setFormData({ ...formData, nombre_fantasia: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider">CUIT</label>
              <input
                type="text"
                placeholder="XX-XXXXXXXX-X"
                className="w-full border border-outline-variant rounded-lg px-3 py-2.5 text-body-md focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-surface"
                value={formData.cuit || ''}
                onChange={e => setFormData({ ...formData, cuit: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider">Email</label>
              <input
                type="email"
                className="w-full border border-outline-variant rounded-lg px-3 py-2.5 text-body-md focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-surface"
                value={formData.email || ''}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider">Teléfono</label>
              <input
                type="text"
                className="w-full border border-outline-variant rounded-lg px-3 py-2.5 text-body-md focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-surface"
                value={formData.telefono || ''}
                onChange={e => setFormData({ ...formData, telefono: e.target.value })}
              />
            </div>

            <div className="md:col-span-2 space-y-1">
              <label className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider">Dirección</label>
              <input
                type="text"
                className="w-full border border-outline-variant rounded-lg px-3 py-2.5 text-body-md focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-surface"
                value={formData.direccion || ''}
                onChange={e => setFormData({ ...formData, direccion: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider">Localidad</label>
              <input
                type="text"
                className="w-full border border-outline-variant rounded-lg px-3 py-2.5 text-body-md focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-surface"
                value={formData.localidad || ''}
                onChange={e => setFormData({ ...formData, localidad: e.target.value })}
              />
            </div>

            <div className="md:col-span-2 space-y-1">
              <label className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider">Notas</label>
              <textarea
                rows={3}
                className="w-full border border-outline-variant rounded-lg px-3 py-2.5 text-body-md focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-surface resize-none"
                value={formData.notas || ''}
                onChange={e => setFormData({ ...formData, notas: e.target.value })}
              />
            </div>

            <div className="flex items-center gap-3 py-2">
              <input
                id="activo-prov"
                type="checkbox"
                className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary"
                checked={formData.activo}
                onChange={e => setFormData({ ...formData, activo: e.target.checked })}
              />
              <label htmlFor="activo-prov" className="text-body-md font-medium text-on-surface">Proveedor Activo</label>
            </div>
          </div>
        </form>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-outline-variant">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="min-w-[120px]">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar'}
          </Button>
        </div>
      </div>
    </div>
  )
}
