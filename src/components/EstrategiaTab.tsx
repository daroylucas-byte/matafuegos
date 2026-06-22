import React, { useState } from 'react'
import {
  TrendingUp,
  DollarSign,
  Package,
  FileText,
  BarChart2,
  Star,
  Target,
  Megaphone,
  Zap,
  Trash2,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Coins,
  Sparkles,
  Download,
  Calendar,
  AlertCircle
} from 'lucide-react'
import { useEstrategia } from '../hooks/useEstrategia'
import type { InformeEstrategia } from '../hooks/useEstrategia'
import { Button } from './ui/Button'
import { cn, formatCurrency, formatDate } from '../lib/utils'
import toast from 'react-hot-toast'

interface EstrategiaTabProps {
  localId: string
  saldo: number
  onSaldoChange: () => void
}

const PERIODOS = [
  { value: 'semana', label: 'Última semana' },
  { value: 'mes', label: 'Último mes' },
  { value: 'trimestre', label: 'Último trimestre' }
] as const

const OBJETIVOS = [
  {
    value: 'rentabilidad',
    label: 'Mejorar Rentabilidad',
    icon: DollarSign,
    desc: 'Optimiza precios y prioriza productos de mayor margen.',
    inputLabel: '¿Cuánto % querés mejorar?',
    placeholder: 'Ej: 15'
  },
  {
    value: 'liquidar',
    label: 'Liquidar Stock Parado',
    icon: Package,
    desc: 'Propone ofertas y combos para dar salida a mercadería de bajo movimiento.',
    inputLabel: null,
    placeholder: null
  },
  {
    value: 'volumen',
    label: 'Aumentar Volumen',
    icon: TrendingUp,
    desc: 'Estrategias de descuento por volumen y ventas cruzadas para facturar más.',
    inputLabel: '¿Cuánto $ adicional buscás?',
    placeholder: 'Ej: 500000'
  }
] as const

const PERIOD_DISPLAY: Record<string, string> = {
  semana: 'Última semana',
  mes: 'Último mes',
  trimestre: 'Último trimestre'
}

const OBJECTIVE_DISPLAY: Record<string, string> = {
  rentabilidad: 'Mejorar Rentabilidad',
  liquidar: 'Liquidar Stock Parado',
  volumen: 'Aumentar Volumen'
}

export const EstrategiaTab: React.FC<EstrategiaTabProps> = ({
  localId,
  saldo,
  onSaldoChange
}) => {
  const { informes, loading, generando, generarInforme, eliminarInforme } = useEstrategia(localId)
  
  // Local Form state
  const [periodo, setPeriodo] = useState<'semana' | 'mes' | 'trimestre'>('mes')
  const [objetivo, setObjetivo] = useState<'rentabilidad' | 'liquidar' | 'volumen'>('rentabilidad')
  const [metaValor, setMetaValor] = useState<string>('')
  
  // View selection state
  const [selectedReport, setSelectedReport] = useState<InformeEstrategia | null>(null)
  
  // Collapsible accordion state for Vista B
  const [openSections, setOpenSections] = useState({
    resumen: true,
    indicadores: true,
    priorizar: true,
    objetivos: true,
    promociones: true,
    acciones: true,
    discontinuar: true
  })

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const selectedObjectiveData = OBJETIVOS.find(o => o.value === objetivo)

  const handleGenerar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (saldo < 800) {
      toast.error('Saldo insuficiente. Necesitás al menos 800 créditos.')
      return
    }

    const val = metaValor ? parseFloat(metaValor) : undefined
    
    try {
      await generarInforme({
        periodo,
        objetivo,
        meta_valor: val
      })
      onSaldoChange()
      setMetaValor('')
    } catch (err) {
      // toast error handled inside hook
    }
  }

  const handleExportPDF = () => {
    toast('Exportar PDF - Próximamente disponible', {
      icon: '📄'
    })
  }

  // Vista B: Informe Generado
  if (selectedReport) {
    const reportData = selectedReport.informe
    const formattedDate = formatDate(selectedReport.created_at)

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Navigation */}
        <div>
          <button
            onClick={() => setSelectedReport(null)}
            className="group inline-flex items-center gap-2 px-3 py-2 rounded-xl text-body-sm font-medium text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-all"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Volver a la selección
          </button>
        </div>

        {/* Report Header */}
        <div className="bg-white dark:bg-surface-container rounded-3xl border border-outline-variant p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-label-sm text-primary font-bold tracking-wider uppercase">
                Informe Estratégico de Ventas
              </span>
              <h2 className="text-headline-sm font-bold text-on-surface">
                {OBJECTIVE_DISPLAY[selectedReport.objetivo] || selectedReport.objetivo}
              </h2>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-low rounded-xl border border-outline-variant text-label-sm text-on-surface-variant">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                <span>{formattedDate}</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-low rounded-xl border border-outline-variant text-label-sm text-on-surface-variant">
                <span>Período: {PERIOD_DISPLAY[selectedReport.periodo] || selectedReport.periodo}</span>
              </div>
            </div>
          </div>

          {selectedReport.meta_valor !== null && (
            <div className="p-3 bg-primary/5 border border-primary/10 rounded-xl text-body-sm text-on-surface flex items-center gap-2">
              <span className="font-semibold text-primary">Meta de optimización:</span>
              <span>
                {selectedReport.objetivo === 'rentabilidad'
                  ? `${selectedReport.meta_valor}% de mejora en rentabilidad`
                  : formatCurrency(selectedReport.meta_valor)}
              </span>
            </div>
          )}
        </div>

        {/* Collapsible Sections Container */}
        <div className="space-y-4">
          {/* 1. Resumen Ejecutivo */}
          <div className="bg-white dark:bg-surface-container rounded-2xl border border-outline-variant overflow-hidden shadow-sm">
            <button
              onClick={() => toggleSection('resumen')}
              className="w-full flex items-center justify-between px-6 py-4 bg-surface-container-low/50 hover:bg-surface-container transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                  <FileText className="h-5 w-5" />
                </div>
                <span className="text-title-sm font-bold text-on-surface">Resumen Ejecutivo</span>
              </div>
              {openSections.resumen ? (
                <ChevronUp className="h-5 w-5 text-on-surface-variant" />
              ) : (
                <ChevronDown className="h-5 w-5 text-on-surface-variant" />
              )}
            </button>
            
            {openSections.resumen && (
              <div className="px-6 py-5 border-t border-outline-variant bg-white dark:bg-surface-container-lowest/50 text-body-md text-on-surface-variant leading-relaxed">
                {reportData?.resumen_ejecutivo || 'No disponible'}
              </div>
            )}
          </div>

          {/* 2. Indicadores Clave */}
          <div className="bg-white dark:bg-surface-container rounded-2xl border border-outline-variant overflow-hidden shadow-sm">
            <button
              onClick={() => toggleSection('indicadores')}
              className="w-full flex items-center justify-between px-6 py-4 bg-surface-container-low/50 hover:bg-surface-container transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
                  <BarChart2 className="h-5 w-5" />
                </div>
                <span className="text-title-sm font-bold text-on-surface">Indicadores Clave</span>
              </div>
              {openSections.indicadores ? (
                <ChevronUp className="h-5 w-5 text-on-surface-variant" />
              ) : (
                <ChevronDown className="h-5 w-5 text-on-surface-variant" />
              )}
            </button>

            {openSections.indicadores && (
              <div className="px-6 py-5 border-t border-outline-variant bg-white dark:bg-surface-container-lowest/50">
                {!reportData?.indicadores_clave || reportData.indicadores_clave.length === 0 ? (
                  <p className="text-body-md text-on-surface-variant text-center py-4">No se registran indicadores.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {reportData.indicadores_clave.map((ind, idx) => {
                      const trendColor =
                        ind.tendencia === 'positiva'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
                          : ind.tendencia === 'negativa'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'

                      return (
                        <div
                          key={idx}
                          className="p-4 bg-surface-container rounded-xl border border-outline-variant/60 hover:border-primary/20 transition-all space-y-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <span className="text-label-sm font-bold text-on-surface-variant">{ind.nombre}</span>
                            <span className={cn('px-2.5 py-0.5 rounded-full text-label-xs font-bold capitalize', trendColor)}>
                              {ind.tendencia}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <p className="text-headline-sm font-bold text-on-surface tabular">{ind.valor}</p>
                            <p className="text-body-sm text-on-surface-variant">{ind.comentario}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. Productos a Priorizar */}
          <div className="bg-white dark:bg-surface-container rounded-2xl border border-outline-variant overflow-hidden shadow-sm">
            <button
              onClick={() => toggleSection('priorizar')}
              className="w-full flex items-center justify-between px-6 py-4 bg-surface-container-low/50 hover:bg-surface-container transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 rounded-lg">
                  <Star className="h-5 w-5" />
                </div>
                <span className="text-title-sm font-bold text-on-surface">Productos a Priorizar</span>
              </div>
              {openSections.priorizar ? (
                <ChevronUp className="h-5 w-5 text-on-surface-variant" />
              ) : (
                <ChevronDown className="h-5 w-5 text-on-surface-variant" />
              )}
            </button>

            {openSections.priorizar && (
              <div className="px-6 py-5 border-t border-outline-variant bg-white dark:bg-surface-container-lowest/50">
                {!reportData?.productos_priorizar || reportData.productos_priorizar.length === 0 ? (
                  <p className="text-body-md text-on-surface-variant text-center py-4">No hay productos sugeridos en esta categoría.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-outline-variant/60 text-label-sm font-bold text-on-surface-variant">
                          <th className="py-3 px-4">Producto</th>
                          <th className="py-3 px-4">Precio Actual</th>
                          <th className="py-3 px-4">Precio Sugerido</th>
                          <th className="py-3 px-4">Acción</th>
                          <th className="py-3 px-4">Razón</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/40">
                        {reportData.productos_priorizar.map((prod, idx) => {
                          const actionClasses = {
                            mantener: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400',
                            subir_precio: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400',
                            promocionar: 'bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-400',
                            discontinuar: 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400'
                          }

                          return (
                            <tr key={idx} className="hover:bg-surface-container/30 text-body-sm text-on-surface transition-colors">
                              <td className="py-3 px-4 font-semibold">{prod.nombre}</td>
                              <td className="py-3 px-4 tabular">{formatCurrency(prod.precio_actual)}</td>
                              <td className="py-3 px-4 font-medium text-primary tabular">{formatCurrency(prod.precio_sugerido)}</td>
                              <td className="py-3 px-4">
                                <span className={cn('px-2.5 py-0.5 rounded-full text-label-xs font-bold capitalize', actionClasses[prod.accion] || 'bg-gray-100')}>
                                  {prod.accion.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-on-surface-variant max-w-xs">{prod.razon}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 4. Objetivos de Ventas */}
          <div className="bg-white dark:bg-surface-container rounded-2xl border border-outline-variant overflow-hidden shadow-sm">
            <button
              onClick={() => toggleSection('objetivos')}
              className="w-full flex items-center justify-between px-6 py-4 bg-surface-container-low/50 hover:bg-surface-container transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-lg">
                  <Target className="h-5 w-5" />
                </div>
                <span className="text-title-sm font-bold text-on-surface">Objetivos de Ventas</span>
              </div>
              {openSections.objetivos ? (
                <ChevronUp className="h-5 w-5 text-on-surface-variant" />
              ) : (
                <ChevronDown className="h-5 w-5 text-on-surface-variant" />
              )}
            </button>

            {openSections.objetivos && (
              <div className="px-6 py-5 border-t border-outline-variant bg-white dark:bg-surface-container-lowest/50">
                {!reportData?.objetivos_ventas || reportData.objetivos_ventas.length === 0 ? (
                  <p className="text-body-md text-on-surface-variant text-center py-4">No se establecieron objetivos.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {reportData.objetivos_ventas.map((obj, idx) => (
                      <div
                        key={idx}
                        className="p-4 bg-surface-container rounded-xl border border-outline-variant/60 space-y-3"
                      >
                        <span className="text-body-sm font-bold text-on-surface">{obj.producto}</span>
                        <div className="grid grid-cols-2 gap-2 text-body-sm pt-1">
                          <div className="p-2.5 bg-surface-container-low rounded-lg border border-outline-variant/50">
                            <span className="block text-label-xs text-on-surface-variant">Cantidad Objetivo</span>
                            <span className="font-bold text-on-surface tabular">{obj.cantidad_objetivo} u.</span>
                          </div>
                          <div className="p-2.5 bg-surface-container-low rounded-lg border border-outline-variant/50">
                            <span className="block text-label-xs text-on-surface-variant">Monto Estimado</span>
                            <span className="font-bold text-primary tabular">{formatCurrency(obj.monto_objetivo)}</span>
                          </div>
                        </div>
                        <div className="text-label-xs text-on-surface-variant flex items-center gap-1.5">
                          <span className="font-semibold text-primary">Plazo:</span>
                          <span>{obj.plazo}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 5. Promociones Sugeridas */}
          <div className="bg-white dark:bg-surface-container rounded-2xl border border-outline-variant overflow-hidden shadow-sm">
            <button
              onClick={() => toggleSection('promociones')}
              className="w-full flex items-center justify-between px-6 py-4 bg-surface-container-low/50 hover:bg-surface-container transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400 rounded-lg">
                  <Megaphone className="h-5 w-5" />
                </div>
                <span className="text-title-sm font-bold text-on-surface">Promociones Sugeridas</span>
              </div>
              {openSections.promociones ? (
                <ChevronUp className="h-5 w-5 text-on-surface-variant" />
              ) : (
                <ChevronDown className="h-5 w-5 text-on-surface-variant" />
              )}
            </button>

            {openSections.promociones && (
              <div className="px-6 py-5 border-t border-outline-variant bg-white dark:bg-surface-container-lowest/50">
                {!reportData?.promociones_sugeridas || reportData.promociones_sugeridas.length === 0 ? (
                  <p className="text-body-md text-on-surface-variant text-center py-4">No hay promociones propuestas.</p>
                ) : (
                  <div className="space-y-4">
                    {reportData.promociones_sugeridas.map((promo, idx) => (
                      <div
                        key={idx}
                        className="p-5 bg-surface-container rounded-xl border border-outline-variant/60 space-y-4"
                      >
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <h4 className="text-body-md font-bold text-on-surface">{promo.titulo}</h4>
                          <span className="px-2.5 py-1 bg-primary text-white rounded-lg text-label-xs font-bold">
                            Descuento: {promo.descuento_sugerido}
                          </span>
                        </div>
                        <p className="text-body-sm text-on-surface-variant leading-relaxed">
                          {promo.descripcion}
                        </p>
                        
                        {promo.productos_involucrados?.length > 0 && (
                          <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-outline-variant/40">
                            <span className="text-label-xs font-semibold text-on-surface-variant">Productos:</span>
                            {promo.productos_involucrados.map((prod, pIdx) => (
                              <span key={pIdx} className="px-2 py-0.5 bg-surface-container-lowest text-on-surface text-label-xs border border-outline-variant rounded-full">
                                {prod}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="p-3 bg-surface-container-low rounded-lg border border-outline-variant/50 text-body-sm text-on-surface-variant">
                          <span className="font-bold text-primary mr-1">Justificación:</span>
                          {promo.justificacion}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 6. Acciones Inmediatas */}
          <div className="bg-white dark:bg-surface-container rounded-2xl border border-outline-variant overflow-hidden shadow-sm">
            <button
              onClick={() => toggleSection('acciones')}
              className="w-full flex items-center justify-between px-6 py-4 bg-surface-container-low/50 hover:bg-surface-container transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-50 dark:bg-yellow-950/30 text-yellow-600 dark:text-yellow-400 rounded-lg">
                  <Zap className="h-5 w-5" />
                </div>
                <span className="text-title-sm font-bold text-on-surface">Acciones Inmediatas</span>
              </div>
              {openSections.acciones ? (
                <ChevronUp className="h-5 w-5 text-on-surface-variant" />
              ) : (
                <ChevronDown className="h-5 w-5 text-on-surface-variant" />
              )}
            </button>

            {openSections.acciones && (
              <div className="px-6 py-5 border-t border-outline-variant bg-white dark:bg-surface-container-lowest/50">
                {!reportData?.acciones_inmediatas || reportData.acciones_inmediatas.length === 0 ? (
                  <p className="text-body-md text-on-surface-variant text-center py-4">No se sugieren acciones inmediatas.</p>
                ) : (
                  <div className="space-y-3">
                    {reportData.acciones_inmediatas
                      .sort((a, b) => a.prioridad - b.prioridad)
                      .map((acc, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-4 p-4 bg-surface-container rounded-xl border border-outline-variant/50 hover:border-primary/20 transition-all"
                        >
                          <div className="flex-shrink-0 flex items-center justify-center h-7 w-7 rounded-full bg-primary text-white text-label-md font-bold">
                            {acc.prioridad}
                          </div>
                          <div className="space-y-1">
                            <p className="text-body-md font-medium text-on-surface">{acc.accion}</p>
                            <p className="text-body-sm text-on-surface-variant">
                              <span className="font-semibold text-primary">Impacto Estimado:</span> {acc.impacto_estimado}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 7. Productos a Discontinuar */}
          <div className="bg-white dark:bg-surface-container rounded-2xl border border-outline-variant overflow-hidden shadow-sm">
            <button
              onClick={() => toggleSection('discontinuar')}
              className="w-full flex items-center justify-between px-6 py-4 bg-surface-container-low/50 hover:bg-surface-container transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-lg">
                  <Trash2 className="h-5 w-5" />
                </div>
                <span className="text-title-sm font-bold text-on-surface">Productos a Discontinuar</span>
              </div>
              {openSections.discontinuar ? (
                <ChevronUp className="h-5 w-5 text-on-surface-variant" />
              ) : (
                <ChevronDown className="h-5 w-5 text-on-surface-variant" />
              )}
            </button>

            {openSections.discontinuar && (
              <div className="px-6 py-5 border-t border-outline-variant bg-white dark:bg-surface-container-lowest/50">
                {!reportData?.productos_discontinuar || reportData.productos_discontinuar.length === 0 ? (
                  <div className="flex items-center gap-2 text-body-md text-on-surface-variant text-center py-4 justify-center">
                    <AlertCircle className="h-5 w-5 text-emerald-500" />
                    <span>No hay productos sugeridos para discontinuar en este ciclo.</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-outline-variant/60 text-label-sm font-bold text-on-surface-variant">
                          <th className="py-3 px-4">Producto</th>
                          <th className="py-3 px-4">Stock Actual</th>
                          <th className="py-3 px-4">Razón</th>
                          <th className="py-3 px-4">Sugerencia</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/40">
                        {reportData.productos_discontinuar.map((prod, idx) => (
                          <tr key={idx} className="hover:bg-surface-container/30 text-body-sm text-on-surface transition-colors">
                            <td className="py-3 px-4 font-semibold text-rose-700 dark:text-rose-400">{prod.nombre}</td>
                            <td className="py-3 px-4 font-medium text-on-surface tabular">{prod.stock_actual} u.</td>
                            <td className="py-3 px-4 text-on-surface-variant max-w-xs">{prod.razon}</td>
                            <td className="py-3 px-4 text-on-surface-variant max-w-xs italic">"{prod.sugerencia}"</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action button: Export */}
        <div className="flex justify-end pt-2">
          <Button
            onClick={handleExportPDF}
            variant="secondary"
            className="flex items-center gap-2 rounded-xl"
          >
            <Download className="h-4 w-4" />
            Exportar PDF
          </Button>
        </div>
      </div>
    )
  }

  // Vista A: Formulario de Generación & Historial
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Title Panel */}
      <div className="bg-white dark:bg-surface-container rounded-3xl border border-outline-variant p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-primary/10 rounded-2xl text-primary mt-1">
            <TrendingUp className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-headline-sm font-bold text-on-surface">
              Agente Estratégico de Ventas
            </h2>
            <p className="text-body-md text-on-surface-variant">
              Generá análisis automáticos, planificá objetivos comerciales y definí promociones usando IA.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5 shrink-0 self-start md:self-auto">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-primary text-on-primary rounded-2xl font-bold text-body-md shadow-sm">
            <Coins className="h-5 w-5" />
            <span>800 créditos</span>
          </div>
          <span className="text-label-xs text-on-surface-variant">Costo por informe estratégico</span>
        </div>
      </div>

      {/* Main Options / Form Panel */}
      <form onSubmit={handleGenerar} className="bg-white dark:bg-surface-container rounded-3xl border border-outline-variant p-6 md:p-8 space-y-6 shadow-sm">
        <h3 className="text-title-md font-bold text-on-surface">Configurar Nuevo Informe</h3>
        
        {/* Toggle Selector: Período */}
        <div className="space-y-2">
          <label className="text-label-md font-bold text-on-surface-variant block">
            Período de análisis de ventas
          </label>
          <div className="flex gap-2 p-1 bg-surface-container-low rounded-2xl border border-outline-variant w-fit">
            {PERIODOS.map(p => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPeriodo(p.value)}
                className={cn(
                  'px-5 py-2.5 rounded-xl text-label-md font-bold transition-all',
                  periodo === p.value
                    ? 'bg-white dark:bg-surface-container-high shadow-sm text-primary'
                    : 'text-on-surface-variant hover:bg-white/50 dark:hover:bg-white/5'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Toggle Cards: Objetivo */}
        <div className="space-y-2">
          <label className="text-label-md font-bold text-on-surface-variant block">
            Objetivo principal de la estrategia
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {OBJETIVOS.map(o => {
              const Icon = o.icon
              const isSelected = objetivo === o.value
              return (
                <div
                  key={o.value}
                  onClick={() => {
                    setObjetivo(o.value)
                    setMetaValor('')
                  }}
                  className={cn(
                    'p-5 rounded-2xl border text-left cursor-pointer transition-all hover:shadow-md flex flex-col justify-between h-36',
                    isSelected
                      ? 'border-primary bg-primary/5 ring-1 ring-primary dark:bg-primary/10'
                      : 'border-outline-variant bg-surface-container-lowest hover:border-primary/40'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-body-md font-bold text-on-surface">{o.label}</span>
                    <Icon className={cn('h-5 w-5 shrink-0', isSelected ? 'text-primary' : 'text-on-surface-variant')} />
                  </div>
                  <p className="text-body-sm text-on-surface-variant leading-relaxed">
                    {o.desc}
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Conditional Input */}
        {selectedObjectiveData?.inputLabel && (
          <div className="space-y-2 max-w-md animate-in slide-in-from-top-2 duration-200">
            <label className="text-label-md font-bold text-on-surface-variant block">
              {selectedObjectiveData.inputLabel}
            </label>
            <div className="relative">
              <input
                type="number"
                required
                min="0"
                value={metaValor}
                onChange={e => setMetaValor(e.target.value)}
                placeholder={selectedObjectiveData.placeholder || ''}
                className="w-full pl-4 pr-10 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl text-body-md focus:ring-2 focus:ring-primary outline-none focus:border-primary transition-all tabular"
              />
              <div className="absolute inset-y-0 right-3 flex items-center justify-center pointer-events-none text-on-surface-variant font-bold text-body-md">
                {objetivo === 'rentabilidad' ? '%' : '$'}
              </div>
            </div>
          </div>
        )}

        {/* Submit action */}
        <div className="space-y-3 pt-2">
          <Button
            type="submit"
            isLoading={generando}
            disabled={generando || saldo < 800}
            className="w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 text-body-md transition-transform active:scale-[0.99]"
          >
            <Sparkles className="h-5 w-5" />
            {generando ? 'Generando análisis estratégico...' : 'Generar Informe Estratégico'}
          </Button>

          {saldo < 800 && (
            <p className="text-label-sm text-error text-center flex items-center justify-center gap-1.5">
              <AlertCircle className="h-4 w-4" />
              Saldo insuficiente. Cargá saldo de marketing para generar informes estratégicos.
            </p>
          )}
        </div>
      </form>

      {/* History / Previous Reports Panel */}
      <div className="bg-white dark:bg-surface-container rounded-3xl border border-outline-variant p-6 shadow-sm space-y-5">
        <h3 className="text-title-md font-bold text-on-surface flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Informes Anteriores
        </h3>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-on-surface-variant">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            <span className="text-body-sm">Cargando historial de informes...</span>
          </div>
        ) : informes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-on-surface-variant border border-dashed border-outline-variant/60 rounded-2xl bg-surface-container-lowest/30">
            <AlertCircle className="h-8 w-8 opacity-30 text-on-surface-variant" />
            <p className="text-body-md">Aún no has generado ningún informe para este local.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {informes.map(inf => {
              const formattedDate = formatDate(inf.created_at)
              const resumenCorto = inf.informe?.resumen_ejecutivo
                ? inf.informe.resumen_ejecutivo.slice(0, 140) + '...'
                : inf.resumen_texto || 'Sin resumen ejecutivo cargado.'

              return (
                <div
                  key={inf.id}
                  className="p-5 bg-surface-container-lowest rounded-2xl border border-outline-variant hover:border-primary/50 transition-all hover:shadow-md flex flex-col justify-between gap-4 group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-label-xs text-on-surface-variant">{formattedDate}</span>
                      <span className="px-2.5 py-0.5 bg-primary/10 text-primary text-label-xs font-bold rounded-full capitalize">
                        {inf.periodo}
                      </span>
                    </div>

                    <h4 className="text-body-md font-bold text-on-surface group-hover:text-primary transition-colors">
                      {OBJECTIVE_DISPLAY[inf.objetivo] || inf.objetivo}
                    </h4>

                    <p className="text-body-sm text-on-surface-variant leading-relaxed">
                      {resumenCorto}
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setSelectedReport(inf)}
                      className="text-label-xs text-primary font-bold hover:underline"
                    >
                      Ver informe completo →
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm('¿Eliminás este informe? No se puede deshacer.')) {
                          eliminarInforme(inf.id)
                          if (selectedReport?.id === inf.id) setSelectedReport(null)
                        }
                      }}
                      className="text-label-xs text-on-surface-variant hover:text-error transition-colors px-2 py-1 rounded-lg hover:bg-error/10"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
