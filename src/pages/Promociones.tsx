import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Sparkles, Wallet, History, Image, CheckCircle, XCircle,
  Send, ChevronDown, ChevronUp, Upload, Loader2,
  Eye, Plus, Megaphone, TrendingUp, Smartphone, Package, LayoutGrid
} from 'lucide-react'
import { useLocal } from '../contexts/LocalContext'
import { usePromociones } from '../hooks/usePromociones'
import type { TipoImagen } from '../hooks/usePromociones'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { cn } from '../lib/utils'
import toast from 'react-hot-toast'
import { EstrategiaTab } from '../components/EstrategiaTab'

type Tab = 'propuestas' | 'aprobadas'
type MainTab = 'promociones' | 'estrategia'

const COSTOS = { generar_promos: 600, generar_imagen_simple: 1250, generar_imagen_pack: 3000, generar_imagen_carrusel: 5000, analizar_identidad: 500 }

export default function Promociones() {
  const { activeLocalId } = useLocal()
  const {
    promociones, config, identidad, saldo, transacciones,
    loading, generando, generandoImagen, analizando,
    guardarInstruccion, actualizarEstado,
    generarPromociones, generarImagen, analizarIdentidadVisual, refetch,
  } = usePromociones(activeLocalId)

  const [searchParams, setSearchParams] = useSearchParams()
  const [tab, setTab] = useState<Tab>('propuestas')
  const [mainTab, setMainTab] = useState<MainTab>('promociones')
  const [showSaldoModal, setShowSaldoModal] = useState(false)
  const [showHistorialModal, setShowHistorialModal] = useState(false)
  const [showOpciones, setShowOpciones] = useState(false)
  const [showIdentidad, setShowIdentidad] = useState(false)
  const [montoCarga, setMontoCarga] = useState(5000)
  const [cargandoMP, setCargandoMP] = useState(false)
  const [instruccion, setInstruccion] = useState(config?.instruccion_extra || '')
  const [archivosIdentidad, setArchivosIdentidad] = useState<File[]>([])
  const [previewsIdentidad, setPreviewsIdentidad] = useState<string[]>([])

  // Opciones avanzadas
  const [objetivo, setObjetivo] = useState('')
  const [publico, setPublico] = useState('')
  const [canal, setCanal] = useState('')
  const [tono, setTono] = useState('')

  // Detectar retorno de Mercado Pago y polling hasta que el saldo se acredite
  useEffect(() => {
    const pago = searchParams.get('pago')
    if (!pago) return
    setSearchParams({})

    if (pago === 'fallido') {
      toast.error('El pago no pudo procesarse. Intentá de nuevo.')
      return
    }
    if (pago === 'pendiente') {
      toast('Pago pendiente. Se acreditará cuando se confirme.', { icon: '⏳' })
      return
    }
    if (pago === 'exitoso') {
      toast.success('¡Pago aprobado! Actualizando saldo...')
      const saldoAnterior = saldo
      let intentos = 0
      const intervalo = setInterval(async () => {
        intentos++
        await refetch()
        // refetch actualiza saldo en el hook — chequeamos via supabase directo
        const { data } = await import('../lib/supabase').then(m =>
          m.supabase.from('saldo_marketing').select('saldo').eq('id', 1).single()
        )
        if ((data?.saldo ?? 0) > saldoAnterior || intentos >= 10) {
          clearInterval(intervalo)
          if ((data?.saldo ?? 0) > saldoAnterior) {
            toast.success('¡Saldo acreditado!')
          }
          refetch()
        }
      }, 2000)
    }
  }, [searchParams])

  const iniciarPagoMP = async (monto: number) => {
    if (!activeLocalId) return
    setCargandoMP(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crear-preferencia-mp`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ monto, local_id: activeLocalId })
        }
      )
      const result = await res.json()
      if (!result.ok) throw new Error(result.error)
      setShowSaldoModal(false)
      window.location.href = result.init_point
    } catch (err: any) {
      toast.error('Error al iniciar pago: ' + err.message)
    } finally {
      setCargandoMP(false)
    }
  }

  const promosPendientes = promociones.filter(p => p.estado === 'pendiente' || p.estado === 'rechazada')
  const promosAprobadas = promociones.filter(p => p.estado === 'aprobada' || p.estado === 'enviada')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 5)
    setArchivosIdentidad(files)
    setPreviewsIdentidad(files.map(f => URL.createObjectURL(f)))
  }

  const handleGenerarPromociones = () => {
    generarPromociones({
      instruccion_extra: config?.instruccion_extra || '',
      objetivo_negocio: objetivo,
      publico_objetivo: publico,
      canal_publicacion: canal,
      tono_deseado: tono,
    })
  }

  const handleEnviarWhatsApp = async (promo: typeof promociones[0]) => {
    const texto = encodeURIComponent(promo.texto_promo)
    window.open(`https://wa.me/?text=${texto}`, '_blank')
    await actualizarEstado(promo.id, 'enviada')
  }

  if (!activeLocalId) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-on-surface-variant">
        <Megaphone className="h-10 w-10 opacity-30" />
        <p className="text-body-lg">Seleccioná un local para ver las promociones</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-headline-lg font-bold text-on-surface flex items-center gap-2">
            <Sparkles className="h-7 w-7 text-primary" /> Promociones IA
          </h1>
          <p className="text-body-lg text-on-surface-variant">
            Generá promociones automáticas con inteligencia artificial basadas en tus ventas y stock.
          </p>
        </div>

        {/* Saldo widget */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistorialModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-outline-variant bg-surface-container-low text-body-sm font-medium text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            <History className="h-4 w-4" />
            Historial
          </button>
          <button
            onClick={() => setShowSaldoModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary font-bold text-body-sm hover:bg-primary/90 transition-colors"
          >
            <Wallet className="h-4 w-4" />
            ${saldo.toLocaleString('es-AR')} saldo
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Main Tabs switcher */}
      <div className="flex gap-1.5 p-1 bg-surface-container-low rounded-2xl border border-outline-variant w-fit">
        <button
          onClick={() => setMainTab('promociones')}
          className={cn(
            'px-5 py-2 rounded-xl text-label-md font-bold transition-all flex items-center gap-2',
            mainTab === 'promociones'
              ? 'bg-white shadow-sm text-primary'
              : 'text-on-surface-variant hover:bg-white/50'
          )}
        >
          <Megaphone className="h-4 w-4" />
          Promociones
        </button>
        <button
          onClick={() => setMainTab('estrategia')}
          className={cn(
            'px-5 py-2 rounded-xl text-label-md font-bold transition-all flex items-center gap-2',
            mainTab === 'estrategia'
              ? 'bg-white shadow-sm text-primary'
              : 'text-on-surface-variant hover:bg-white/50'
          )}
        >
          <TrendingUp className="h-4 w-4" />
          Informe Estratégico
        </button>
      </div>

      {mainTab === 'estrategia' ? (
        <EstrategiaTab
          localId={activeLocalId}
          saldo={saldo}
          onSaldoChange={refetch}
        />
      ) : (
        <>
          {/* Panel de generación */}
          <div className="bg-white rounded-3xl border border-outline-variant p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-title-md font-bold text-on-surface">Generar nuevas promociones</h2>
              <span className="text-label-sm text-on-surface-variant bg-surface-container px-3 py-1 rounded-full">
                Costo: ${COSTOS.generar_promos.toLocaleString('es-AR')} créditos
              </span>
            </div>

            {/* Instrucción personalizada */}
            <div className="space-y-2">
              <label className="text-label-md font-bold text-on-surface-variant">Instrucción especial (opcional)</label>
              <div className="flex gap-2">
                <textarea
                  value={instruccion}
                  onChange={e => setInstruccion(e.target.value)}
                  placeholder="Ej: Esta semana quiero liquidar los matafuegos de 10kg. Enfocá las promos en empresas industriales."
                  rows={2}
                  className="flex-1 p-3 bg-surface-container-lowest border border-outline-variant rounded-xl text-body-md resize-none focus:ring-2 focus:ring-primary outline-none"
                />
                <Button
                  variant="secondary"
                  onClick={() => guardarInstruccion(instruccion)}
                  className="self-end rounded-xl px-4"
                >
                  Guardar
                </Button>
              </div>
            </div>

            {/* Opciones avanzadas */}
            <button
              onClick={() => setShowOpciones(!showOpciones)}
              className="flex items-center gap-1 text-label-md text-primary font-medium"
            >
              {showOpciones ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              Opciones avanzadas
            </button>

            {showOpciones && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-surface-container-lowest rounded-2xl border border-outline-variant">
                {[
                  { label: 'Objetivo del negocio', val: objetivo, set: setObjetivo, placeholder: 'Ej: liquidar stock de extintores ABC' },
                  { label: 'Público objetivo', val: publico, set: setPublico, placeholder: 'Ej: empresas industriales, PyMEs' },
                  { label: 'Canal de publicación', val: canal, set: setCanal, placeholder: 'Ej: Instagram, WhatsApp, cartel' },
                  { label: 'Tono deseado', val: tono, set: setTono, placeholder: 'Ej: urgente, profesional, amigable' },
                ].map(({ label, val, set, placeholder }) => (
                  <div key={label} className="space-y-1">
                    <label className="text-label-sm font-bold text-on-surface-variant">{label}</label>
                    <input
                      type="text"
                      value={val}
                      onChange={e => set(e.target.value)}
                      placeholder={placeholder}
                      className="w-full p-2.5 bg-white border border-outline-variant rounded-xl text-body-sm focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>
                ))}
              </div>
            )}

            <Button
              onClick={handleGenerarPromociones}
              isLoading={generando}
              disabled={generando || saldo < COSTOS.generar_promos}
              className="w-full rounded-xl py-3"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {generando ? 'Generando 4 promociones...' : 'Generar 4 Promociones con IA'}
            </Button>

            {saldo < COSTOS.generar_promos && (
              <p className="text-label-sm text-error text-center">
                Saldo insuficiente. Cargá al menos ${COSTOS.generar_promos.toLocaleString('es-AR')} para generar.
              </p>
            )}
          </div>

          {/* Identidad visual */}
          <div className="bg-white rounded-3xl border border-outline-variant p-6 space-y-4">
            <button
              onClick={() => setShowIdentidad(!showIdentidad)}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-primary" />
                <h2 className="text-title-md font-bold text-on-surface">Identidad Visual de Marca</h2>
                {identidad && (
                  <span className="text-label-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Analizada</span>
                )}
              </div>
              {showIdentidad ? <ChevronUp className="h-4 w-4 text-on-surface-variant" /> : <ChevronDown className="h-4 w-4 text-on-surface-variant" />}
            </button>

            {showIdentidad && (
              <div className="space-y-4">
                {identidad && (
                  <div className="p-4 bg-surface-container-lowest rounded-2xl border border-outline-variant space-y-2 text-body-sm">
                    <p><span className="font-bold">Colores:</span> {identidad.colores_predominantes}</p>
                    <p><span className="font-bold">Estilo:</span> {identidad.estilo_general}</p>
                    <p><span className="font-bold">Elementos:</span> {identidad.palabras_clave_visuales}</p>
                    {identidad.instrucciones_para_ia && (
                      <p className="text-on-surface-variant italic">"{identidad.instrucciones_para_ia}"</p>
                    )}
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-label-md font-bold text-on-surface-variant">
                      Subí imágenes de tu marca (hasta 5)
                    </label>
                    <span className="text-label-xs text-on-surface-variant">
                      Costo: ${COSTOS.analizar_identidad.toLocaleString('es-AR')} créditos
                    </span>
                  </div>

                  <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-outline-variant rounded-2xl cursor-pointer hover:border-primary/50 transition-colors bg-surface-container-lowest">
                    <Upload className="h-6 w-6 text-outline mb-2" />
                    <span className="text-body-sm text-on-surface-variant">Logos, folletos, publicidades anteriores</span>
                    <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileChange} />
                  </label>

                  {previewsIdentidad.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {previewsIdentidad.map((src, i) => (
                        <img key={i} src={src} className="h-20 w-20 object-cover rounded-xl border border-outline-variant" />
                      ))}
                    </div>
                  )}

                  <Button
                    onClick={() => analizarIdentidadVisual(archivosIdentidad)}
                    isLoading={analizando}
                    disabled={analizando || archivosIdentidad.length === 0 || saldo < COSTOS.analizar_identidad}
                    variant="secondary"
                    className="w-full rounded-xl"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    {analizando ? 'Analizando...' : 'Analizar Identidad Visual'}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-surface-container-low rounded-2xl border border-outline-variant w-fit">
            {([['propuestas', 'Propuestas IA', promosPendientes.length], ['aprobadas', 'Aprobadas', promosAprobadas.length]] as const).map(([key, label, count]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={cn(
                  'px-5 py-2 rounded-xl text-label-md font-bold transition-all flex items-center gap-2',
                  tab === key ? 'bg-white shadow-sm text-primary' : 'text-on-surface-variant hover:bg-white/50'
                )}
              >
                {label}
                {count > 0 && (
                  <span className={cn('text-label-xs px-2 py-0.5 rounded-full font-bold', tab === key ? 'bg-primary text-white' : 'bg-outline-variant text-on-surface-variant')}>
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Lista de promociones */}
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              {(tab === 'propuestas' ? promosPendientes : promosAprobadas).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-on-surface-variant">
                  <Megaphone className="h-10 w-10 opacity-30" />
                  <p className="text-body-lg">
                    {tab === 'propuestas' ? 'No hay propuestas pendientes. ¡Generá nuevas!' : 'No hay promociones aprobadas todavía.'}
                  </p>
                </div>
              ) : (
                (tab === 'propuestas' ? promosPendientes : promosAprobadas).map(promo => (
                  <PromoCard
                    key={promo.id}
                    promo={promo}
                    generandoImagen={generandoImagen === promo.id}
                    onAprobar={() => actualizarEstado(promo.id, 'aprobada')}
                    onRechazar={() => actualizarEstado(promo.id, 'rechazada')}
                    onGenerarImagen={(tipo) => generarImagen(promo.id, tipo)}
                    onEnviarWhatsApp={() => handleEnviarWhatsApp(promo)}
                    onQuitar={() => actualizarEstado(promo.id, 'rechazada')}
                    saldo={saldo}
                    tab={tab}
                  />
                ))
              )}
            </div>
          )}
        </>
      )}

      {/* Modal cargar saldo */}
      <Modal isOpen={showSaldoModal} onClose={() => setShowSaldoModal(false)} title="Cargar Saldo de Marketing">
        <div className="space-y-5">
          <p className="text-body-md text-on-surface-variant">
            El pago se procesa a través de Mercado Pago. El saldo se acredita automáticamente al confirmar.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[100, 5000, 10000, 20000, 50000].map(m => (
              <button
                key={m}
                onClick={() => setMontoCarga(m)}
                className={cn(
                  'py-4 rounded-xl border font-bold text-body-md transition-all',
                  montoCarga === m ? 'border-primary bg-primary/10 text-primary' : 'border-outline-variant text-on-surface-variant hover:border-primary/50'
                )}
              >
                ${m.toLocaleString('es-AR')}
                <span className="block text-label-xs font-normal mt-0.5 opacity-70">
                  {m.toLocaleString('es-AR')} créditos
                </span>
              </button>
            ))}
          </div>
          <div className="p-3 bg-surface-container-lowest rounded-xl text-body-sm text-on-surface-variant space-y-1">
            <p>💡 <strong>Referencia de costos:</strong></p>
            <p>• Generar 4 promos: $600 créditos</p>
            <p>• Generar imagen: simple $1.250 / pack $3.000 / carrusel $5.000 créditos</p>
            <p>• Analizar identidad visual: $500 créditos</p>
          </div>
          <Button
            className="w-full rounded-xl"
            onClick={() => iniciarPagoMP(montoCarga)}
            isLoading={cargandoMP}
            disabled={cargandoMP}
          >
            <Wallet className="h-4 w-4 mr-2" />
            Pagar ${montoCarga.toLocaleString('es-AR')} con Mercado Pago
          </Button>
        </div>
      </Modal>

      {/* Modal historial */}
      <Modal isOpen={showHistorialModal} onClose={() => setShowHistorialModal(false)} title="Historial de Transacciones" maxWidth="lg">
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {transacciones.length === 0 ? (
            <p className="text-center text-on-surface-variant py-8">Sin transacciones todavía</p>
          ) : (
            transacciones.map(t => (
              <div key={t.id} className="flex items-center justify-between p-3 rounded-xl bg-surface-container-lowest border border-outline-variant">
                <div className="space-y-0.5">
                  <p className="text-label-md font-bold text-on-surface uppercase">
                    {t.tipo.replace('_', ' ')}
                  </p>
                  <p className="text-label-sm text-on-surface-variant">
                    {new Date(t.created_at).toLocaleString('es-AR')}
                  </p>
                  {t.descripcion && <p className="text-label-xs text-on-surface-variant">{t.descripcion}</p>}
                </div>
                <div className="text-right">
                  <p className={cn('text-body-md font-bold', t.monto >= 0 ? 'text-emerald-600' : 'text-error')}>
                    {t.monto >= 0 ? '+' : ''}${Math.abs(t.monto).toLocaleString('es-AR')}
                  </p>
                  <p className="text-label-xs text-on-surface-variant">Saldo: ${t.saldo_nuevo.toLocaleString('es-AR')}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  )
}

const getFormatLabel = (formato: string) => {
  const labels: Record<string, string> = {
    feed_cuadrado: 'Feed cuadrado',
    feed_vertical: 'Feed vertical',
    story: 'Story'
  }
  return labels[formato] || formato.replace(/_/g, ' ')
}

interface PromoCardProps {
  promo: any
  generandoImagen: boolean
  onAprobar: () => void
  onRechazar: () => void
  onGenerarImagen: (tipo: TipoImagen) => void
  onEnviarWhatsApp: () => void
  onQuitar: () => void
  saldo: number
  tab: Tab
}

function PromoCard({ promo, generandoImagen, onAprobar, onRechazar, onGenerarImagen, onEnviarWhatsApp, onQuitar, saldo, tab }: PromoCardProps) {
  const [tipoGenerando, setTipoGenerando] = useState<TipoImagen | null>(null)

  useEffect(() => {
    if (!generandoImagen) {
      setTipoGenerando(null)
    }
  }, [generandoImagen])

  const handleGenerarClick = (tipo: TipoImagen) => {
    setTipoGenerando(tipo)
    onGenerarImagen(tipo)
  }

  return (
    <div className={cn(
      'bg-white rounded-2xl border p-5 space-y-4 transition-all',
      promo.estado === 'rechazada' ? 'border-error/30 opacity-70' : 'border-outline-variant',
      promo.estado === 'enviada' && 'border-emerald-200'
    )}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-body-md text-on-surface flex-1 leading-relaxed">{promo.texto_promo}</p>
        <span className={cn(
          'text-label-xs font-bold px-2 py-1 rounded-full shrink-0',
          promo.estado === 'pendiente' && 'bg-yellow-100 text-yellow-700',
          promo.estado === 'aprobada' && 'bg-emerald-100 text-emerald-700',
          promo.estado === 'rechazada' && 'bg-red-100 text-red-700',
          promo.estado === 'enviada' && 'bg-blue-100 text-blue-700',
        )}>
          {promo.estado.toUpperCase()}
        </span>
      </div>

      {promo.imagenes_meta ? (
        <div className="space-y-3 pt-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {promo.imagenes_meta.imagenes?.map((img: any, idx: number) => {
              const cleanLabel = getFormatLabel(img.formato)
              return (
                <div key={idx} className="flex flex-col gap-1">
                  <a
                    href={img.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block aspect-square overflow-hidden rounded-xl border border-outline-variant hover:border-primary/50 transition-all bg-surface-container-lowest"
                  >
                    <img
                      src={img.url}
                      alt={cleanLabel}
                      className="w-full h-full object-cover"
                    />
                  </a>
                  <span className="text-label-xs text-on-surface-variant font-medium text-center leading-normal">
                    {cleanLabel} {img.dimension}
                  </span>
                </div>
              )
            })}
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              promo.imagenes_meta?.imagenes?.forEach((img: any) => {
                window.open(img.url, '_blank')
              })
            }}
            className="rounded-xl w-full sm:w-auto"
          >
            Descargar todo
          </Button>
        </div>
      ) : (
        promo.imagen_url && (
          <img src={promo.imagen_url} alt="Imagen de promo" className="w-full rounded-xl object-cover max-h-64" />
        )
      )}

      <div className="flex flex-wrap gap-2">
        {tab === 'propuestas' && promo.estado !== 'rechazada' && (
          <>
            <Button size="sm" onClick={onAprobar} className="rounded-xl bg-emerald-600 hover:bg-emerald-600/90">
              <CheckCircle className="h-3.5 w-3.5 mr-1" /> Aprobar
            </Button>
            <Button size="sm" variant="secondary" onClick={onRechazar} className="rounded-xl text-error border-error/30 hover:bg-error/5">
              <XCircle className="h-3.5 w-3.5 mr-1" /> Rechazar
            </Button>
          </>
        )}

        {tab === 'aprobadas' && (
          <>
            <Button size="sm" onClick={onEnviarWhatsApp} className="rounded-xl bg-green-600 hover:bg-green-600/90">
              <Send className="h-3.5 w-3.5 mr-1" /> WhatsApp
            </Button>
            <Button size="sm" variant="secondary" onClick={onQuitar} className="rounded-xl">
              <XCircle className="h-3.5 w-3.5 mr-1" /> Quitar
            </Button>
          </>
        )}

        {promo.imagen_url && !promo.imagenes_meta && (
          <a href={promo.imagen_url} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="secondary" className="rounded-xl">
              <Image className="h-3.5 w-3.5 mr-1" /> Ver imagen
            </Button>
          </a>
        )}
      </div>

      {!promo.imagen_url && !promo.imagenes_meta && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {([
            { tipo: 'simple', label: 'WhatsApp / Feed', costo: COSTOS.generar_imagen_simple, desc: '1 imagen cuadrada', icon: Smartphone },
            { tipo: 'pack', label: 'Pack Meta', costo: COSTOS.generar_imagen_pack, desc: 'Feed + Vertical + Story', icon: Package },
            { tipo: 'carrusel', label: 'Carrusel', costo: COSTOS.generar_imagen_carrusel, desc: 'Hasta 5 tarjetas', icon: LayoutGrid }
          ] as const).map(({ tipo, label, costo, desc, icon: Icon }) => {
            const isInsuficiente = saldo < costo
            const isCargando = tipoGenerando === tipo

            return (
              <div key={tipo} className="flex flex-col gap-1 w-full">
                <button
                  type="button"
                  onClick={() => handleGenerarClick(tipo)}
                  disabled={generandoImagen || isInsuficiente}
                  className={cn(
                    'flex flex-col items-center justify-center p-3 text-center border rounded-xl transition-all h-full bg-white text-on-surface',
                    isInsuficiente
                      ? 'border-outline-variant opacity-50 cursor-not-allowed'
                      : 'border-outline-variant hover:border-primary/50 hover:bg-surface-container-lowest'
                  )}
                >
                  {isCargando ? (
                    <Loader2 className="h-5 w-5 animate-spin text-primary mb-1.5" />
                  ) : (
                    <Icon className="h-5 w-5 text-on-surface-variant mb-1.5" />
                  )}
                  <span className="text-body-sm font-bold leading-tight">{label}</span>
                  <span className="text-label-xs text-on-surface-variant leading-tight mt-0.5">{desc}</span>
                  <span className="text-label-xs text-primary font-bold mt-1.5">
                    ${costo.toLocaleString('es-AR')}
                  </span>
                </button>
                {isInsuficiente && (
                  <span className="text-label-xs text-error text-center font-medium mt-0.5">
                    Saldo insuficiente
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}

      <p className="text-label-xs text-on-surface-variant">
        {new Date(promo.fecha).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
      </p>
    </div>
  )
}
