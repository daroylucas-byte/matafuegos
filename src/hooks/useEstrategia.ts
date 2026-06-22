import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export interface GenerarEstrategiaOpciones {
  periodo: 'semana' | 'mes' | 'trimestre'
  objetivo: 'rentabilidad' | 'liquidar' | 'volumen'
  meta_valor?: number
}

export interface InformeEstrategia {
  id: number
  created_at: string
  local_id: string
  periodo: string
  objetivo: string
  meta_valor: number | null
  resumen_texto: string | null
  costo_creditos: number
  informe: {
    resumen_ejecutivo: string
    indicadores_clave: {
      nombre: string
      valor: string
      tendencia: 'positiva' | 'negativa' | 'neutral'
      comentario: string
    }[]
    productos_priorizar: {
      nombre: string
      precio_actual: number
      precio_sugerido: number
      razon: string
      accion: 'mantener' | 'subir_precio' | 'promocionar' | 'discontinuar'
    }[]
    objetivos_ventas: {
      producto: string
      cantidad_objetivo: number
      monto_objetivo: number
      plazo: string
    }[]
    promociones_sugeridas: {
      titulo: string
      descripcion: string
      productos_involucrados: string[]
      descuento_sugerido: string
      justificacion: string
    }[]
    acciones_inmediatas: {
      prioridad: number
      accion: string
      impacto_estimado: string
    }[]
    productos_discontinuar: {
      nombre: string
      stock_actual: number
      razon: string
      sugerencia: string
    }[]
  }
}

export function useEstrategia(localId: string | null) {
  const [informes, setInformes] = useState<InformeEstrategia[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [generando, setGenerando] = useState<boolean>(false)

  const fetchInformes = useCallback(async () => {
    if (!localId) {
      setInformes([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('informes_estrategia')
        .select('*')
        .eq('local_id', localId)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) {
        throw error
      }

      setInformes(data || [])
    } catch (err: any) {
      console.error('Error fetching strategy reports:', err.message)
      toast.error('Error al cargar informes estratégicos')
    } finally {
      setLoading(false)
    }
  }, [localId])

  useEffect(() => {
    fetchInformes()
  }, [fetchInformes])

  const generarInforme = async (opciones: GenerarEstrategiaOpciones): Promise<void> => {
    if (!localId) {
      toast.error('Local ID no especificado')
      return
    }
    setGenerando(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generar-estrategia`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            local_id: localId,
            periodo: opciones.periodo,
            objetivo: opciones.objetivo,
            meta_valor: opciones.meta_valor,
          }),
        }
      )

      const result = await res.json()
      
      if (!res.ok || (result && result.ok === false)) {
        throw new Error(result.error || result.message || 'Error al generar el informe')
      }

      toast.success('¡Informe generado con éxito!')
      await fetchInformes()
    } catch (err: any) {
      console.error('Error in generarInforme:', err)
      toast.error(err.message || 'Error al generar el informe')
      throw err
    } finally {
      setGenerando(false)
    }
  }

  const eliminarInforme = async (id: number) => {
    const { error } = await supabase.from('informes_estrategia').delete().eq('id', id)
    if (error) { toast.error('Error al eliminar el informe'); return }
    setInformes(prev => prev.filter(inf => inf.id !== id))
    toast.success('Informe eliminado')
  }

  return {
    informes,
    loading,
    generando,
    generarInforme,
    eliminarInforme,
    refetch: fetchInformes,
  }
}
