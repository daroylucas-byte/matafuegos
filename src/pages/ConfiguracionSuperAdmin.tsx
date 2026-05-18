import React, { useState } from 'react'
import { ShieldCheck, Layout, Boxes, AlertCircle, Store, Plus, Trash2, MapPin, Loader2, Edit2 } from 'lucide-react'
import { useConfig } from '../contexts/ConfigContext'
import { useLocal } from '../contexts/LocalContext'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { cn } from '../lib/utils'
import { Button } from '../components/ui/Button'
import { useEffect } from 'react'
import { Modal } from '../components/ui/Modal'
import { LocalForm } from '../components/forms/LocalForm'

const ConfiguracionSuperAdmin: React.FC = () => {
  const { config, refreshConfig } = useConfig()
  const { refreshLocales } = useLocal()
  const { rol } = useAuth()
  const [updating, setUpdating] = useState<string | null>(null)
  const [locales, setLocales] = useState<any[]>([])
  const [loadingLocales, setLoadingLocales] = useState(false)
  const [isLocalModalOpen, setIsLocalModalOpen] = useState(false)
  const [editingLocal, setEditingLocal] = useState<any>(null)
  const [savingLocal, setSavingLocal] = useState(false)

  useEffect(() => {
    if (rol === 'superadmin') {
      fetchLocales()
    }
  }, [rol])

  const fetchLocales = async () => {
    setLoadingLocales(true)
    const { data } = await supabase.from('locales').select('*').order('nombre')
    setLocales(data || [])
    setLoadingLocales(false)
  }

  const handleSaveLocal = async (data: any) => {
    setSavingLocal(true)
    try {
      if (editingLocal) {
        const { error } = await supabase
          .from('locales')
          .update(data)
          .eq('id', editingLocal.id)
        if (error) throw error
        toast.success('Local actualizado')
      } else {
        const { error } = await supabase
          .from('locales')
          .insert([data])
        if (error) throw error
        toast.success('Local creado')
      }
      setIsLocalModalOpen(false)
      setEditingLocal(null)
      fetchLocales()
      await refreshLocales()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSavingLocal(false)
    }
  }

  const handleEditLocal = (local: any) => {
    setEditingLocal(local)
    setIsLocalModalOpen(true)
  }

  const handleDeleteLocal = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar el local "${nombre}"? Se perderá la relación de stock en esta sede.`)) return

    try {
      const { error } = await supabase.from('locales').delete().eq('id', id)
      if (error) throw error
      toast.success('Local eliminado')
      fetchLocales()
      await refreshLocales()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  if (rol !== 'superadmin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="w-16 h-16 bg-error/10 text-error rounded-full flex items-center justify-center mb-4">
          <ShieldCheck className="h-8 w-8" />
        </div>
        <h2 className="text-headline-md font-bold text-on-surface">Acceso Restringido</h2>
        <p className="text-body-md text-on-surface-variant max-w-md mt-2">
          Esta página es de uso exclusivo para el Super Administrador del sistema.
        </p>
      </div>
    )
  }

  const modulos = config?.servicios?.modulos || {
    dashboard: true,
    clientes: true,
    ventas: true,
    proveedores: true,
    compras: true,
    caja: true,
    catalogo: true,
    usuarios: true
  }

  const integraciones = config?.servicios?.integraciones || {
    arca: false,
    is: false
  }

  const toggleModulo = async (key: string) => {
    if (key === 'dashboard') {
      toast.error('El módulo Dashboard no puede ser deshabilitado.')
      return
    }

    // Obtener los valores actuales o los defaults si no existen
    const currentServicios = config?.servicios || {}
    const currentModulos = currentServicios.modulos || {}
    
    // Invertir el valor actual
    const nuevoEstado = currentModulos[key] === false ? true : false

    const nuevoValor = {
      ...currentServicios,
      modulos: {
        ...currentModulos,
        [key]: nuevoEstado
      }
    }

    try {
      setUpdating(key)
      const { error } = await supabase
        .from('configuracion')
        .update({ servicios: nuevoValor })
        .eq('id', 1)

      if (error) throw error

      // Forzar actualización del contexto
      await refreshConfig()
      toast.success(`Módulo ${key} ${nuevoEstado ? 'habilitado' : 'deshabilitado'}`)
    } catch (err: any) {
      toast.error('Error al actualizar: ' + err.message)
    } finally {
      setUpdating(null)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="flex items-center gap-4 border-b border-outline-variant pb-6">
        <div className="p-3 bg-primary-container/10 text-primary rounded-2xl shadow-sm">
          <ShieldCheck className="h-8 w-8" />
        </div>
        <div>
          <h1 className="text-headline-lg font-bold">Configuración Super Admin</h1>
          <p className="text-body-md text-on-surface-variant">Gestión de módulos e integraciones del sistema.</p>
        </div>
      </div>

      {/* Sección 1: Módulos */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Layout className="h-5 w-5 text-primary" />
          <h2 className="text-headline-sm font-semibold">Módulos del Sistema</h2>
        </div>
        <p className="text-body-sm text-on-surface-variant mb-6">
          Habilita o deshabilita la visibilidad de las páginas en el menú lateral para todos los usuarios.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ModuleToggle 
            label="Dashboard" 
            desc="Panel principal con métricas" 
            active={modulos.dashboard} 
            onChange={() => toggleModulo('dashboard')}
            loading={updating === 'dashboard'}
            disabled={true}
          />
          <ModuleToggle 
            label="Clientes" 
            desc="Gestión de clientes y cuenta corriente" 
            active={modulos.clientes} 
            onChange={() => toggleModulo('clientes')}
            loading={updating === 'clientes'}
          />
          <ModuleToggle 
            label="Ventas" 
            desc="Ventas, presupuestos y facturación" 
            active={modulos.ventas} 
            onChange={() => toggleModulo('ventas')}
            loading={updating === 'ventas'}
          />
          <ModuleToggle 
            label="Proveedores" 
            desc="Gestión de proveedores" 
            active={modulos.proveedores} 
            onChange={() => toggleModulo('proveedores')}
            loading={updating === 'proveedores'}
          />
          <ModuleToggle 
            label="Compras" 
            desc="Registro de compras y stock" 
            active={modulos.compras} 
            onChange={() => toggleModulo('compras')}
            loading={updating === 'compras'}
          />
          <ModuleToggle 
            label="Caja" 
            desc="Control de caja y sesiones" 
            active={modulos.caja} 
            onChange={() => toggleModulo('caja')}
            loading={updating === 'caja'}
          />
          <ModuleToggle 
            label="Catálogo" 
            desc="Productos, precios e inventario" 
            active={modulos.catalogo} 
            onChange={() => toggleModulo('catalogo')}
            loading={updating === 'catalogo'}
          />
          <ModuleToggle 
            label="Usuarios" 
            desc="Gestión de accesos y roles" 
            active={modulos.usuarios} 
            onChange={() => toggleModulo('usuarios')}
            loading={updating === 'usuarios'}
          />
        </div>
      </section>

      {/* Sección 2: Integraciones */}
      <section className="space-y-4 pt-6 border-t border-outline-variant">
        <div className="flex items-center gap-2 mb-2">
          <Boxes className="h-5 w-5 text-secondary" />
          <h2 className="text-headline-sm font-semibold">Integraciones Adicionales</h2>
        </div>
        <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant flex items-center gap-3 mb-6">
          <AlertCircle className="h-5 w-5 text-primary" />
          <p className="text-body-sm">Próximamente: Estas funciones se habilitarán bajo demanda del cliente.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-60">
          <ModuleToggle 
            label="ARCA (ex-AFIP)" 
            desc="Facturación electrónica integrada" 
            active={integraciones.arca} 
            onChange={() => {}}
            disabled={true}
          />
          <ModuleToggle 
            label="IS System" 
            desc="Integración con servicios externos IS" 
            active={integraciones.is} 
            onChange={() => {}}
            disabled={true}
          />
        </div>
      </section>

      {/* Sección 3: Sucursales */}
      <section className="space-y-4 pt-6 border-t border-outline-variant">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            <h2 className="text-headline-sm font-semibold">Gestión de Sucursales</h2>
          </div>
          <Button onClick={() => { setEditingLocal(null); setIsLocalModalOpen(true); }} className="rounded-xl">
            <Plus className="h-4 w-4 mr-2" /> Agregar Local
          </Button>
        </div>
        <p className="text-body-sm text-on-surface-variant mb-6">
          Administra las ubicaciones físicas de tu negocio. El stock y las cajas se dividen por sucursal.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loadingLocales ? (
            <div className="col-span-full py-12 flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : locales.length === 0 ? (
            <div className="col-span-full py-12 text-center text-on-surface-variant italic border-2 border-dashed border-outline-variant rounded-2xl">
              No hay sucursales configuradas.
            </div>
          ) : (
            locales.map(l => (
              <div key={l.id} className="flex items-center justify-between p-4 bg-white border border-outline-variant rounded-xl hover:border-primary/30 transition-all group shadow-sm">
                <div 
                  className="flex items-center gap-4 flex-1 cursor-pointer"
                  onClick={() => handleEditLocal(l)}
                >
                  <div className="h-12 w-12 rounded-xl bg-primary-container/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                    <Store className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-bold text-on-surface">{l.nombre}</p>
                    <p className="text-xs text-on-surface-variant flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {l.direccion || 'Sin dirección'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  <button 
                    onClick={() => handleEditLocal(l)}
                    className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                  >
                    <Edit2 className="h-5 w-5" />
                  </button>
                  <button 
                    onClick={() => handleDeleteLocal(l.id, l.nombre)}
                    className="p-2 text-on-surface-variant hover:text-error hover:bg-error-container/10 rounded-lg transition-all"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Modal de Sucursal */}
      <Modal
        isOpen={isLocalModalOpen}
        onClose={() => { setIsLocalModalOpen(false); setEditingLocal(null); }}
        title={editingLocal ? 'Editar Sucursal' : 'Nueva Sucursal'}
        maxWidth="md"
      >
        <LocalForm
          onSubmit={handleSaveLocal}
          onCancel={() => { setIsLocalModalOpen(false); setEditingLocal(null); }}
          initialData={editingLocal}
          loading={savingLocal}
        />
      </Modal>
    </div>
  )
}

interface ModuleToggleProps {
  label: string;
  desc: string;
  active: boolean;
  onChange: () => void;
  loading?: boolean;
  disabled?: boolean;
}

const ModuleToggle: React.FC<ModuleToggleProps> = ({ label, desc, active, onChange, loading, disabled }) => {
  return (
    <div className={cn(
      "p-4 rounded-xl border transition-all flex items-center justify-between gap-4",
      active ? "bg-white border-primary/30 shadow-sm" : "bg-surface-container-lowest border-outline-variant",
      disabled && "cursor-not-allowed"
    )}>
      <div className="flex-1">
        <h3 className={cn("text-body-md font-bold", !active && "text-on-surface-variant")}>{label}</h3>
        <p className="text-body-xs text-on-surface-variant">{desc}</p>
      </div>
      
      <button
        onClick={(e) => {
          e.preventDefault()
          if (!disabled && !loading) onChange()
        }}
        disabled={disabled || loading}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
          active ? "bg-primary" : "bg-outline-variant",
          (disabled || loading) && "opacity-50 cursor-not-allowed"
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
            active ? "translate-x-5" : "translate-x-0"
          )}
        />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3 h-3 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          </div>
        )}
      </button>
    </div>
  )
}

export default ConfiguracionSuperAdmin
