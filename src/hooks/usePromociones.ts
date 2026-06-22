import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export interface Promocion {
  id: number
  created_at: string
  updated_at: string
  local_id: string
  texto_promo: string
  imagen_url: string | null
  estado: 'pendiente' | 'aprobada' | 'rechazada' | 'enviada'
  canal_envio: string | null
  enviada_at: string | null
  fecha: string
}

export interface ConfigPromo {
  id: number
  local_id: string
  instruccion_extra: string | null
}

export interface IdentidadVisual {
  id: number
  local_id: string
  colores_predominantes: string | null
  tipografia_percibida: string | null
  estilo_general: string | null
  palabras_clave_visuales: string | null
  instrucciones_para_ia: string | null
  actualizado_at: string
}

export interface SaldoMarketing {
  saldo: number
}

export interface TransaccionMarketing {
  id: number
  created_at: string
  tipo: 'carga' | 'generar_promos' | 'generar_imagen' | 'analizar_identidad'
  monto: number
  saldo_nuevo: number
  descripcion: string | null
}

interface GenerarPromosOpciones {
  instruccion_extra?: string
  objetivo_negocio?: string
  publico_objetivo?: string
  canal_publicacion?: string
  tono_deseado?: string
}

export function usePromociones(localId: string | null) {
  const [promociones, setPromociones] = useState<Promocion[]>([])
  const [config, setConfig] = useState<ConfigPromo | null>(null)
  const [identidad, setIdentidad] = useState<IdentidadVisual | null>(null)
  const [saldo, setSaldo] = useState<number>(0)
  const [transacciones, setTransacciones] = useState<TransaccionMarketing[]>([])
  const [loading, setLoading] = useState(true)
  const [generando, setGenerando] = useState(false)
  const [generandoImagen, setGenerandoImagen] = useState<number | null>(null)
  const [analizando, setAnalizando] = useState(false)

  const fetchAll = useCallback(async () => {
    if (!localId) return
    setLoading(true)
    await Promise.all([
      fetchPromociones(),
      fetchConfig(),
      fetchIdentidad(),
      fetchSaldo(),
      fetchTransacciones(),
    ])
    setLoading(false)
  }, [localId])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const fetchPromociones = async () => {
    if (!localId) return
    const { data } = await supabase
      .from('promociones')
      .select('*')
      .eq('local_id', localId)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
    setPromociones(data || [])
  }

  const fetchConfig = async () => {
    if (!localId) return
    const { data } = await supabase
      .from('config_promo')
      .select('*')
      .eq('local_id', localId)
      .single()
    setConfig(data || null)
  }

  const fetchIdentidad = async () => {
    if (!localId) return
    const { data } = await supabase
      .from('identidad_visual')
      .select('*')
      .eq('local_id', localId)
      .single()
    setIdentidad(data || null)
  }

  const fetchSaldo = async () => {
    const { data } = await supabase
      .from('saldo_marketing')
      .select('saldo')
      .eq('id', 1)
      .single()
    setSaldo(data?.saldo || 0)
  }

  const fetchTransacciones = async () => {
    const { data } = await supabase
      .from('transacciones_marketing')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    setTransacciones(data || [])
  }

  const guardarInstruccion = async (instruccion: string) => {
    if (!localId) return
    const { error } = await supabase
      .from('config_promo')
      .upsert({ local_id: localId, instruccion_extra: instruccion, updated_at: new Date().toISOString() }, { onConflict: 'local_id' })
    if (error) { toast.error('Error al guardar instrucción'); return }
    await fetchConfig()
    toast.success('Instrucción guardada')
  }

  const actualizarEstado = async (id: number, estado: Promocion['estado']) => {
    const { error } = await supabase
      .from('promociones')
      .update({ estado, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) { toast.error('Error al actualizar estado'); return }
    setPromociones(prev => prev.map(p => p.id === id ? { ...p, estado } : p))
  }

  const cargarSaldo = async (monto: number) => {
    const { error } = await supabase.rpc('cargar_saldo', {
      monto_carga: monto,
      descripcion_carga: 'Carga manual de saldo'
    })
    if (error) { toast.error('Error al cargar saldo'); return }
    await Promise.all([fetchSaldo(), fetchTransacciones()])
    toast.success(`Saldo cargado: $${monto.toLocaleString('es-AR')}`)
  }

  const generarPromociones = async (opciones: GenerarPromosOpciones = {}) => {
    if (!localId) return
    if (saldo < 600) { toast.error('Saldo insuficiente. Necesitás $600 para generar promociones.'); return }

    setGenerando(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generar-promos`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ local_id: localId, ...opciones })
        }
      )
      const result = await res.json()
      if (!result.ok) throw new Error(result.error)
      await Promise.all([fetchPromociones(), fetchSaldo(), fetchTransacciones()])
      toast.success('¡4 promociones generadas!')
    } catch (err: any) {
      toast.error('Error al generar: ' + err.message)
    } finally {
      setGenerando(false)
    }
  }

  const generarImagen = async (promoId: number) => {
    if (!localId) return
    if (saldo < 1250) { toast.error('Saldo insuficiente. Necesitás $1250 para generar una imagen.'); return }

    setGenerandoImagen(promoId)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generar-imagen-promo`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ promo_id: promoId, local_id: localId })
        }
      )
      const result = await res.json()
      if (!result.ok) throw new Error(result.error)
      await Promise.all([fetchPromociones(), fetchSaldo(), fetchTransacciones()])
      toast.success('¡Imagen generada!')
    } catch (err: any) {
      toast.error('Error al generar imagen: ' + err.message)
    } finally {
      setGenerandoImagen(null)
    }
  }

  const analizarIdentidadVisual = async (archivos: File[]) => {
    if (!localId) return
    if (saldo < 500) { toast.error('Saldo insuficiente. Necesitás $500 para analizar identidad visual.'); return }

    setAnalizando(true)
    try {
      // Convertir archivos a base64
      const imagenesBase64 = await Promise.all(
        archivos.map(async (file) => {
          const buffer = await file.arrayBuffer()
          const bytes = new Uint8Array(buffer)
          let binary = ''
          bytes.forEach(b => binary += String.fromCharCode(b))
          return { data: btoa(binary), mimeType: file.type }
        })
      )

      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analizar-identidad-visual`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ local_id: localId, imagenes_base64: imagenesBase64 })
        }
      )
      const result = await res.json()
      if (!result.ok) throw new Error(result.error)
      await Promise.all([fetchIdentidad(), fetchSaldo(), fetchTransacciones()])
      toast.success('¡Identidad visual analizada!')
    } catch (err: any) {
      toast.error('Error al analizar: ' + err.message)
    } finally {
      setAnalizando(false)
    }
  }

  return {
    promociones,
    config,
    identidad,
    saldo,
    transacciones,
    loading,
    generando,
    generandoImagen,
    analizando,
    guardarInstruccion,
    actualizarEstado,
    cargarSaldo,
    generarPromociones,
    generarImagen,
    analizarIdentidadVisual,
    refetch: fetchAll,
  }
}
