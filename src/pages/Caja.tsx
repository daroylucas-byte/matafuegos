import React, { useState, useEffect } from 'react'
import { 
  Lock, 
  Wallet, 
  TrendingUp, 
  Landmark, 
  Filter, 
  Download,
  ChevronLeft,
  ChevronRight,
  Info,
  ExternalLink,
  ArrowUpDown,
  Play,
  Store
} from 'lucide-react'
import { cn, formatCurrency, formatDatetime } from '../lib/utils'
import { Button } from '../components/ui/Button'
import { MovimientoExtraForm } from '../components/forms/MovimientoExtraForm'
import { CierreCajaForm } from '../components/forms/CierreCajaForm'
import { AperturaCajaForm } from '../components/forms/AperturaCajaForm'

import { supabase } from '../lib/supabase'
import { useLocal } from '../contexts/LocalContext'

const Caja: React.FC = () => {
  const { activeLocalId } = useLocal()
  const [loading, setLoading] = useState(true)
  const [extraOpen, setExtraOpen] = useState(false)
  const [cierreOpen, setCierreOpen] = useState(false)
  const [aperturaOpen, setAperturaOpen] = useState(false)
  const [sesion, setSesion] = useState<any>(null)
  const [movimientos, setMovimientos] = useState<any[]>([])

  const loadCaja = async () => {
    if (!activeLocalId) {
      setSesion(null)
      setMovimientos([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      // 1. Buscar sesión activa para el LOCAL ACTUAL
      const { data: sesionActiva, error: sesionError } = await supabase
        .from('caja_sesiones')
        .select(`
          *,
          profiles:cajero_id (nombre)
        `)
        .eq('local_id', activeLocalId)
        .is('cierre_at', null)
        .order('apertura_at', { ascending: false })
        .limit(1)
        .single()

      if (sesionError && sesionError.code !== 'PGRST116') throw sesionError
      
      if (sesionActiva) {
        setSesion(sesionActiva)
        
        // 2. Cargar movimientos de esta sesión
        const { data: movs, error: movsError } = await supabase
          .from('caja_movimientos')
          .select('*')
          .eq('caja_sesion_id', sesionActiva.id)
          .order('created_at', { ascending: false })
        
        if (movsError) throw movsError
        setMovimientos(movs || [])
      } else {
        setSesion(null)
        setMovimientos([])
      }
    } catch (err: any) {
      console.error('Error cargando caja:', err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCaja()
  }, [activeLocalId])

  // Cálculos dinámicos y Balance Cronológico
  const stats = {
    ingresos: movimientos.filter(m => m.tipo === 'ingreso').reduce((acc, m) => acc + Number(m.monto), 0),
    egresos: movimientos.filter(m => m.tipo === 'egreso').reduce((acc, m) => acc + Number(m.monto), 0),
    efectivo: movimientos.filter(m => m.metodo === 'efectivo').reduce((acc, m) => acc + (m.tipo === 'ingreso' ? Number(m.monto) : -Number(m.monto)), 0),
    transferencia: movimientos.filter(m => m.metodo === 'transferencia').reduce((acc, m) => acc + (m.tipo === 'ingreso' ? Number(m.monto) : -Number(m.monto)), 0),
    tarjetas: movimientos.filter(m => m.metodo === 'tarjeta_debito' || m.metodo === 'tarjeta_credito').reduce((acc, m) => acc + (m.tipo === 'ingreso' ? Number(m.monto) : -Number(m.monto)), 0),
    cheques: movimientos.filter(m => m.metodo === 'cheque').reduce((acc, m) => acc + (m.tipo === 'ingreso' ? Number(m.monto) : -Number(m.monto)), 0)
  }
  const saldoActual = (sesion?.monto_apertura || 0) + stats.ingresos - stats.egresos

  // Generar movimientos con saldo acumulado
  const movimientosConSaldo = [...movimientos]
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .reduce((acc: any[], mov) => {
      const lastSaldo = acc.length > 0 ? acc[acc.length - 1].saldo_acumulado : (sesion?.monto_apertura || 0)
      const nuevoSaldo = mov.tipo === 'ingreso' ? lastSaldo + Number(mov.monto) : lastSaldo - Number(mov.monto)
      acc.push({ ...mov, saldo_acumulado: nuevoSaldo })
      return acc
    }, [])
    .reverse() // Volver a poner los más nuevos arriba para la vista

  return (
    <div className="max-w-[1200px] mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-headline-lg font-bold text-on-surface">Control de Caja</h2>
          <p className="text-on-surface-variant text-body-md">Supervisión y registro de movimientos financieros diarios.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" className="rounded-xl shadow-sm gap-2" onClick={() => setExtraOpen(true)}>
            <ArrowUpDown className="h-5 w-5" />
            Movimiento Extra
          </Button>
          <Button 
            className="rounded-xl shadow-sm gap-2 bg-error hover:bg-error/90"
            onClick={() => setCierreOpen(true)}
            disabled={!sesion}
          >
            <Lock className="h-5 w-5" />
            Cerrar Caja
          </Button>
        </div>
      </div>

      <MovimientoExtraForm 
        open={extraOpen} 
        onClose={() => setExtraOpen(false)} 
        onSuccess={() => { setExtraOpen(false); loadCaja(); }} 
        cajaSessionId={sesion?.id}
      />

      <CierreCajaForm
        open={cierreOpen}
        onClose={() => setCierreOpen(false)}
        onSuccess={() => { setCierreOpen(false); loadCaja(); }}
        sesion={sesion}
        stats={stats}
      />

      <AperturaCajaForm
        open={aperturaOpen}
        onClose={() => setAperturaOpen(false)}
        onSuccess={() => { setAperturaOpen(false); loadCaja(); }}
      />

      {/* Global View Warning / Locked State */}
      {!activeLocalId && !loading && (
        <div className="bg-surface-container-low border-2 border-dashed border-outline-variant rounded-[2.5rem] p-12 text-center space-y-6 animate-in zoom-in-95 duration-500">
          <div className="w-20 h-20 bg-secondary/10 text-secondary rounded-3xl flex items-center justify-center mx-auto mb-4">
            <Store className="h-10 w-10" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-headline-medium font-bold text-on-surface">Seleccione una sucursal</h3>
            <p className="text-on-surface-variant text-body-lg">
              La gestión de caja es específica por sucursal. Por favor, seleccione un local específico en el menú superior para ver o registrar movimientos.
            </p>
          </div>
        </div>
      )}

      {/* Empty State / Box Closed */}
      {activeLocalId && !sesion && !loading && (
        <div className="bg-surface-container-low border-2 border-dashed border-outline-variant rounded-[2.5rem] p-12 text-center space-y-6 animate-in zoom-in-95 duration-500">
          <div className="w-20 h-20 bg-primary/10 text-primary rounded-3xl flex items-center justify-center mx-auto mb-4">
            <Lock className="h-10 w-10" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-headline-medium font-bold text-on-surface">La caja está cerrada</h3>
            <p className="text-on-surface-variant text-body-lg">
              No hay una sesión activa para este turno en este local. Debe abrir la caja para comenzar a registrar movimientos y cobros.
            </p>
          </div>
          <Button 
            className="rounded-2xl h-14 px-8 text-title-medium shadow-lg shadow-primary/20 gap-3"
            onClick={() => setAperturaOpen(true)}
          >
            <Play className="h-5 w-5 ml-1" />
            Abrir Caja Ahora
          </Button>
        </div>
      )}

      {/* Summary Cards Bento Grid */}
      <div className={cn("grid grid-cols-1 md:grid-cols-3 gap-6", !sesion && "opacity-40 grayscale pointer-events-none")}>
        {/* Session Status */}
        <div className="bg-white border border-outline-variant rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-primary-fixed text-primary rounded-lg">
              <Wallet className="h-6 w-6" />
            </div>
            <span className={cn(
              "px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full",
              sesion ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
            )}>
              {sesion ? 'Abierta' : 'Cerrada'}
            </span>
          </div>
          <p className="text-on-surface-variant text-label-sm uppercase mb-1 font-semibold tracking-wider">Sesión Actual</p>
          <h3 className="text-headline-sm font-bold text-on-surface mb-2">Cajero: {sesion?.profiles?.nombre || 'Sin asignar'}</h3>
          <div className="space-y-1 border-t border-outline-variant pt-3 mt-3">
            <div className="flex justify-between text-body-sm">
              <span className="text-on-surface-variant">Apertura:</span>
              <span className="font-medium">{sesion ? formatDatetime(sesion.apertura_at) : '—'}</span>
            </div>
            <div className="flex justify-between text-body-sm">
              <span className="text-on-surface-variant">Monto Inicial:</span>
              <span className="font-medium text-primary">{formatCurrency(sesion?.monto_apertura || 0)}</span>
            </div>
          </div>
        </div>

        {/* Cash Flow */}
        <div className="bg-white border border-outline-variant rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-secondary-fixed text-secondary rounded-lg">
              <TrendingUp className="h-6 w-6" />
            </div>
          </div>
          <p className="text-on-surface-variant text-label-sm uppercase mb-1 font-semibold tracking-wider">Flujo de Fondos</p>
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-body-sm text-on-surface-variant">Ingresos</p>
                <p className="text-headline-sm font-bold text-secondary">{formatCurrency(stats.ingresos)}</p>
              </div>
              <div className="text-right">
                <p className="text-body-sm text-on-surface-variant">Egresos</p>
                <p className="text-headline-sm font-bold text-error">{formatCurrency(stats.egresos)}</p>
              </div>
            </div>
            <div className="w-full bg-surface-container rounded-full h-2 overflow-hidden flex">
              <div 
                className="bg-secondary h-full transition-all duration-1000" 
                style={{ width: `${(stats.ingresos / (stats.ingresos + stats.egresos || 1)) * 100}%` }}
              ></div>
              <div 
                className="bg-error h-full transition-all duration-1000" 
                style={{ width: `${(stats.egresos / (stats.ingresos + stats.egresos || 1)) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Current Balance */}
        <div className="bg-white border border-outline-variant rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-tertiary-fixed text-tertiary rounded-lg">
              <Landmark className="h-6 w-6" />
            </div>
            <p className="text-label-sm font-bold text-on-surface-variant uppercase tracking-wider">Saldo Actual</p>
          </div>
          <h3 className="text-headline-lg font-bold text-on-surface mb-4 tabular">{formatCurrency(saldoActual)}</h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 bg-surface-container rounded-xl border border-outline-variant/50">
              <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-tighter">Efectivo</p>
              <p className="text-label-md font-bold text-on-surface">{formatCurrency((sesion?.monto_apertura || 0) + stats.efectivo)}</p>
            </div>
            <div className="p-2.5 bg-surface-container rounded-xl border border-outline-variant/50">
              <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-tighter">Transferencia</p>
              <p className="text-label-md font-bold text-on-surface">{formatCurrency(stats.transferencia)}</p>
            </div>
            <div className="p-2.5 bg-surface-container rounded-xl border border-outline-variant/50">
              <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-tighter">Tarjetas</p>
              <p className="text-label-md font-bold text-on-surface">{formatCurrency(stats.tarjetas)}</p>
            </div>
            <div className="p-2.5 bg-surface-container rounded-xl border border-outline-variant/50">
              <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-tighter">Cheques</p>
              <p className="text-label-md font-bold text-on-surface">{formatCurrency(stats.cheques)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Movements List Section */}
      <div className="bg-white border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-outline-variant flex items-center justify-between bg-surface-container-lowest">
          <h4 className="text-headline-sm font-bold text-on-surface">Movimientos de Caja</h4>
          <div className="flex gap-2">
            <button className="p-2 hover:bg-surface-container rounded-lg text-on-surface-variant transition-colors">
              <Filter className="h-5 w-5" />
            </button>
            <button className="p-2 hover:bg-surface-container rounded-lg text-on-surface-variant transition-colors">
              <Download className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                <th className="px-6 py-3 text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider">Fecha / Hora</th>
                <th className="px-6 py-3 text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider">Método</th>
                <th className="px-6 py-3 text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider">Descripción</th>
                <th className="px-6 py-3 text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider text-right">Debe</th>
                <th className="px-6 py-3 text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider text-right">Haber</th>
                <th className="px-6 py-3 text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider text-right">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {movimientosConSaldo.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-on-surface-variant italic">
                    No hay movimientos registrados en esta sesión.
                  </td>
                </tr>
              ) : (
                movimientosConSaldo.map((mov) => (
                  <tr key={mov.id} className="table-row-hover group">
                    <td className="px-6 py-4 text-table-data text-on-surface tabular whitespace-nowrap">{formatDatetime(mov.created_at)}</td>
                    <td className="px-6 py-4 text-table-data text-on-surface capitalize">{mov.metodo}</td>
                    <td className="px-6 py-4 text-table-data text-on-surface-variant">{mov.descripcion}</td>
                    <td className="px-6 py-4 text-table-data font-bold text-right tabular text-secondary">
                      {mov.tipo === 'ingreso' ? formatCurrency(mov.monto) : '—'}
                    </td>
                    <td className="px-6 py-4 text-table-data font-bold text-right tabular text-error">
                      {mov.tipo === 'egreso' ? formatCurrency(mov.monto) : '—'}
                    </td>
                    <td className="px-6 py-4 text-table-data font-bold text-right tabular text-on-surface bg-surface-container-lowest/50">
                      {formatCurrency(mov.saldo_acumulado)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Table Pagination */}
        <div className="px-6 py-4 flex items-center justify-between bg-surface-container-low border-t border-outline-variant font-medium">
          <div className="flex items-center gap-4">
            <span className="text-body-sm text-on-surface-variant">Filas por página:</span>
            <select className="bg-surface border border-outline-variant rounded-lg text-body-sm px-2 py-1 outline-none">
              <option>10</option>
              <option selected>25</option>
              <option>50</option>
            </select>
          </div>
          <div className="flex items-center gap-6">
            <span className="text-body-sm text-on-surface-variant font-medium">Página 1 de 4</span>
            <div className="flex gap-1">
              <button className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant disabled:opacity-30" disabled>
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Contextual Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-8">
        <div className="relative overflow-hidden rounded-2xl h-[200px] group border border-outline-variant shadow-sm">
          <img 
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
            alt="Safety guide"
            src="https://images.unsplash.com/photo-1556742049-3605e54d32e9?auto=format&fit=crop&q=80&w=800"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-6 flex flex-col justify-end">
            <h5 className="text-white font-headline-sm mb-1">Guía de Seguridad</h5>
            <p className="text-white/80 text-body-sm">Recuerde realizar retiros parciales de efectivo cuando el saldo supere los $100.000 para mayor seguridad en el local.</p>
          </div>
        </div>
        <div className="bg-primary-fixed-dim border border-primary-container/30 rounded-2xl p-6 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-3 text-primary">
              <Info className="h-5 w-5" />
              <h5 className="text-label-md font-bold uppercase tracking-wider">Reporte Rápido</h5>
            </div>
            <p className="text-on-background text-body-md leading-relaxed">
              El arqueo actual presenta una coincidencia del 100% con los registros del sistema. No se detectaron discrepancias en los últimos 5 turnos.
            </p>
          </div>
          <a href="#" className="mt-4 text-primary font-bold text-label-sm flex items-center gap-2 hover:underline">
            Ver historial de arqueos
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </div>
  )
}

export default Caja
