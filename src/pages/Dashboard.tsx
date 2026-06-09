import React, { useState, useEffect } from 'react'
import { 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  ShoppingCart, 
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Package,
  Users,
  CreditCard,
  History,
  Store,
  ArrowRight
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useLocal } from '../contexts/LocalContext'
import { cn, formatCurrency, formatDate } from '../lib/utils'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'

// --- Interfaces para los datos ---
interface KPIData {
  ventasTotales: number;
  ingresosNetos: number;
  totalCobrado: number;
  saldoPendienteClientes: number;
  totalCompras: number;
  comprasImpagas: number;
}

interface ExtraMovs {
  ingresos: number;
  egresos: number;
}

const Dashboard: React.FC = () => {
  const { activeLocalId, isGlobalView } = useLocal()
  const [loading, setLoading] = useState(true)

  // Filtros de fecha: Mes actual por defecto
  const hoy = new Date()
  const [desde, setDesde] = useState(
    new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0]
  )
  const [hasta, setHasta] = useState(hoy.toISOString().split('T')[0])

  // Estados para los widgets
  const [kpis, setKpis] = useState<KPIData>({
    ventasTotales: 0,
    ingresosNetos: 0,
    totalCobrado: 0,
    saldoPendienteClientes: 0,
    totalCompras: 0,
    comprasImpagas: 0
  })
  const [extraMovs, setExtraMovs] = useState<ExtraMovs>({ ingresos: 0, egresos: 0 })
  const [topProductos, setTopProductos] = useState<any[]>([])
  const [alertasStock, setAlertasStock] = useState<any[]>([])
  const [topDeudores, setTopDeudores] = useState<any[]>([])
  const [comprasVencidas, setComprasVencidas] = useState<any[]>([])
  const [ultimoKardex, setUltimoKardex] = useState<any[]>([])

  const loadData = async () => {
    try {
      setLoading(true)

      // 1. KPIs de Ventas y Compras
      const fetchKPIs = async () => {
        // Ventas
        let vq = supabase.from('ventas')
          .select('total, descuento, saldo_pendiente')
          .not('estado', 'in', '(presupuesto,cancelado)')
          .gte('fecha', desde)
          .lte('fecha', hasta)
        if (!isGlobalView) vq = vq.eq('local_id', activeLocalId)
        const { data: vData } = await vq

        // Compras
        let cq = supabase.from('compras')
          .select('total, saldo_pendiente')
          .not('estado', 'in', '(borrador,cancelada)')
          .gte('fecha', desde)
          .lte('fecha', hasta)
        if (!isGlobalView) cq = cq.eq('local_id', activeLocalId)
        const { data: cData } = await cq

        const vTotal = vData?.reduce((acc, v) => acc + (v.total || 0), 0) || 0
        const vNeto = vData?.reduce((acc, v) => acc + (v.total - (v.descuento || 0)), 0) || 0
        const vCobrado = vData?.reduce((acc, v) => acc + (v.total - (v.saldo_pendiente || 0)), 0) || 0
        const vPendiente = vData?.reduce((acc, v) => acc + (v.saldo_pendiente || 0), 0) || 0
        
        const cTotal = cData?.reduce((acc, c) => acc + (c.total || 0), 0) || 0
        const cPendiente = cData?.reduce((acc, c) => acc + (c.saldo_pendiente || 0), 0) || 0

        setKpis({
          ventasTotales: vTotal,
          ingresosNetos: vNeto,
          totalCobrado: vCobrado,
          saldoPendienteClientes: vPendiente,
          totalCompras: cTotal,
          comprasImpagas: cPendiente
        })
      }

      // 2. Movimientos Extraordinarios
      const fetchExtra = async () => {
        let eq = supabase.from('movimientos_extra')
          .select('tipo, monto')
          .gte('fecha', desde)
          .lte('fecha', hasta)
        if (!isGlobalView) eq = eq.eq('local_id', activeLocalId)
        const { data: eData } = await eq

        setExtraMovs({
          ingresos: eData?.filter(m => m.tipo === 'ingreso').reduce((acc, m) => acc + m.monto, 0) || 0,
          egresos: eData?.filter(m => m.tipo === 'egreso').reduce((acc, m) => acc + m.monto, 0) || 0
        })
      }

      // 3. Productos más vendidos
      const fetchTopProducts = async () => {
        // Si no existe la RPC, usamos la vista (según instrucciones)
        let vq = supabase.from('vista_productos_mas_vendidos')
          .select('producto_id, producto_nombre, producto_codigo, unidad, cantidad_total, monto_total')
          .gte('fecha', desde)
          .lte('fecha', hasta)
        if (!isGlobalView) vq = vq.eq('local_id', activeLocalId)
        
        const { data: tpData } = await vq
        
        // Agrupar manualmente por si la vista tiene filas por día
        const grouped = (tpData || []).reduce((acc: any, curr) => {
          const key = curr.producto_id
          if (!acc[key]) {
            acc[key] = { ...curr, cantidad: 0, monto: 0 }
          }
          acc[key].cantidad += curr.cantidad_total
          acc[key].monto += curr.monto_total
          return acc
        }, {})

        setTopProductos(Object.values(grouped).sort((a: any, b: any) => b.cantidad - a.cantidad).slice(0, 8))
      }

      // 4. Alertas de stock
      const fetchStockAlerts = async () => {
        let sq = supabase.from('stock_por_local')
          .select('stock, local_id, productos(nombre, codigo, stock_minimo, es_servicio, activo)')
          .eq('productos.es_servicio', false)
          .eq('productos.activo', true)
        
        if (!isGlobalView) sq = sq.eq('local_id', activeLocalId)
        
        const { data: sData } = await sq
        const filtered = (sData || [])
          .map((s: any) => ({
            nombre: s.productos.nombre,
            codigo: s.productos.codigo,
            stock_minimo: s.productos.stock_minimo || 0,
            stock: s.stock,
            local_id: s.local_id
          }))
          .filter(s => s.stock <= s.stock_minimo)
          .sort((a, b) => a.stock - b.stock)

        setAlertasStock(filtered)
      }

      // 5. Clientes con más deuda
      const fetchTopDebtors = async () => {
        let dq = supabase.from('vista_deuda_clientes_por_local')
          .select('cliente_id, razon_social, nombre_fantasia, saldo_deudor, total_facturado')
          .gt('saldo_deudor', 0)
        
        if (!isGlobalView) dq = dq.eq('local_id', activeLocalId)
        
        const { data: dData } = await dq
        
        // Agrupar por cliente
        const grouped = (dData || []).reduce((acc: any, curr) => {
          const key = curr.cliente_id
          if (!acc[key]) {
            acc[key] = { ...curr, saldo_deudor: 0, total_facturado: 0 }
          }
          acc[key].saldo_deudor += curr.saldo_deudor
          acc[key].total_facturado += curr.total_facturado
          return acc
        }, {})

        setTopDeudores(Object.values(grouped).sort((a: any, b: any) => b.saldo_deudor - a.saldo_deudor).slice(0, 8))
      }

      // 6. Compras impagas
      const fetchUnpaidPurchases = async () => {
        let upq = supabase.from('compras')
          .select('id, numero, fecha, fecha_vencimiento, saldo_pendiente, total, numero_factura, proveedores(razon_social)')
          .not('estado', 'in', '(borrador,cancelada)')
          .gt('saldo_pendiente', 0)
        
        if (!isGlobalView) upq = upq.eq('local_id', activeLocalId)
        // Filtro de fecha para compras impagas es opcional pero lo incluimos por coherencia
        upq = upq.gte('fecha', desde).lte('fecha', hasta)

        const { data: upData } = await upq.order('fecha_vencimiento', { ascending: true, nullsFirst: false }).limit(10)
        setComprasVencidas(upData || [])
      }

      // 7. Último Kardex
      const fetchKardex = async () => {
        let kq = supabase.from('vista_kardex')
          .select('*')
          .gte('created_at', desde + 'T00:00:00')
          .lte('created_at', hasta + 'T23:59:59')
        
        if (!isGlobalView) kq = kq.eq('local_id', activeLocalId)
        
        const { data: kData } = await kq.order('created_at', { ascending: false }).limit(15)
        setUltimoKardex(kData || [])
      }

      await Promise.all([
        fetchKPIs(),
        fetchExtra(),
        fetchTopProducts(),
        fetchStockAlerts(),
        fetchTopDebtors(),
        fetchUnpaidPurchases(),
        fetchKardex()
      ])

    } catch (err) {
      console.error('Error cargando dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [activeLocalId, isGlobalView, desde, hasta])

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      
      {/* --- Filtros Globales --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-outline-variant shadow-sm sticky top-0 z-20">
        <div>
          <h2 className="text-headline-md font-bold text-on-surface">Panel de Control</h2>
          <div className="flex items-center gap-2 text-label-md text-on-surface-variant">
            <Store className="h-4 w-4" />
            {isGlobalView ? 'Vista Consolidada (Todos los locales)' : 'Filtrado por local activo'}
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-surface-container-low p-1 rounded-lg border border-outline-variant">
            <div className="flex items-center gap-2 px-3 py-1.5">
              <span className="text-label-sm text-on-surface-variant font-semibold">Desde:</span>
              <input 
                type="date" 
                value={desde} 
                onChange={(e) => setDesde(e.target.value)}
                className="bg-transparent border-none text-body-sm focus:ring-0 cursor-pointer"
              />
            </div>
            <div className="w-px h-4 bg-outline-variant"></div>
            <div className="flex items-center gap-2 px-3 py-1.5">
              <span className="text-label-sm text-on-surface-variant font-semibold">Hasta:</span>
              <input 
                type="date" 
                value={hasta} 
                onChange={(e) => setHasta(e.target.value)}
                className="bg-transparent border-none text-body-sm focus:ring-0 cursor-pointer"
              />
            </div>
          </div>
          {loading && <LoadingSpinner className="h-5 w-5 text-primary" />}
        </div>
      </div>

      {/* --- KPI Cards Grid --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard 
          title="Ventas Totales" 
          value={kpis.ventasTotales} 
          icon={<ShoppingCart className="h-5 w-5" />} 
          color="primary"
          subtitle="Monto bruto facturado"
        />
        <KPICard 
          title="Ingresos Netos" 
          value={kpis.ingresosNetos} 
          icon={<TrendingUp className="h-5 w-5" />} 
          color="green"
          subtitle="Ventas menos descuentos"
        />
        <KPICard 
          title="Total Cobrado" 
          value={kpis.totalCobrado} 
          icon={<CheckCircle2 className="h-5 w-5" />} 
          color="blue"
          subtitle="Dinero ingresado de ventas"
        />
        <KPICard 
          title="Deuda Clientes" 
          value={kpis.saldoPendienteClientes} 
          icon={<Clock className="h-5 w-5" />} 
          color="orange"
          subtitle="Saldos en cta. cte."
        />
        <KPICard 
          title="Total Compras" 
          value={kpis.totalCompras} 
          icon={<Package className="h-5 w-5" />} 
          color="purple"
          subtitle="Inversión en mercadería"
        />
        <KPICard 
          title="Compras Impagas" 
          value={kpis.comprasImpagas} 
          icon={<CreditCard className="h-5 w-5" />} 
          color="red"
          subtitle="Deuda con proveedores"
        />
      </div>

      {/* --- Movimientos Extraordinarios --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-xl border border-outline-variant flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-50 text-green-600 rounded-lg">
              <ArrowUpRight className="h-6 w-6" />
            </div>
            <div>
              <p className="text-label-sm text-on-surface-variant uppercase tracking-wider">Ingresos Extra</p>
              <h4 className="text-headline-sm font-bold text-green-700">{formatCurrency(extraMovs.ingresos)}</h4>
            </div>
          </div>
          <div className="text-right">
            <p className="text-body-xs text-on-surface-variant">Movimientos varios</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-outline-variant flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-50 text-red-600 rounded-lg">
              <ArrowDownRight className="h-6 w-6" />
            </div>
            <div>
              <p className="text-label-sm text-on-surface-variant uppercase tracking-wider">Gastos Extra</p>
              <h4 className="text-headline-sm font-bold text-red-700">{formatCurrency(extraMovs.egresos)}</h4>
            </div>
          </div>
          <div className="text-right">
            <p className="text-body-xs text-on-surface-variant">Egresos de caja varios</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* --- Widget 3: Productos más vendidos --- */}
        <DashboardCard title="Productos Más Vendidos" icon={<TrendingUp className="h-5 w-5 text-primary" />}>
          <div className="space-y-4">
            {topProductos.length > 0 ? topProductos.map((p, idx) => (
              <div key={p.producto_id} className="flex items-center gap-4 group">
                <div className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-label-md font-bold text-on-surface-variant">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-body-md font-medium truncate">{p.producto_nombre}</p>
                  <p className="text-body-xs text-on-surface-variant">{p.producto_codigo} • {p.cantidad} {p.unidad}</p>
                </div>
                <div className="text-right">
                  <p className="text-body-md font-bold">{formatCurrency(p.monto)}</p>
                  <div className="w-24 h-1.5 bg-surface-container-low rounded-full mt-1 overflow-hidden">
                    <div 
                      className="h-full bg-primary" 
                      style={{ width: `${(p.cantidad / topProductos[0].cantidad) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            )) : <div className="py-8 text-center text-on-surface-variant">Sin datos en este periodo</div>}
          </div>
        </DashboardCard>

        {/* --- Widget 5: Clientes con más deuda --- */}
        <DashboardCard title="Mayores Deudores (Clientes)" icon={<Users className="h-5 w-5 text-orange-500" />}>
          <div className="space-y-4">
            {topDeudores.length > 0 ? topDeudores.map((c) => (
              <Link 
                key={c.cliente_id} 
                to={`/clientes/${c.cliente_id}`}
                className="flex items-center gap-4 p-2 -mx-2 rounded-lg hover:bg-surface-container-lowest transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
                  <Users className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-body-md font-medium truncate">{c.razon_social || c.nombre_fantasia}</p>
                  <p className="text-body-xs text-on-surface-variant">Facturado: {formatCurrency(c.total_facturado)}</p>
                </div>
                <div className="text-right">
                  <p className="text-body-md font-bold text-error">{formatCurrency(c.saldo_deudor)}</p>
                  <p className="text-label-xs uppercase text-error/70 font-bold">Saldo deudor</p>
                </div>
                <ArrowRight className="h-4 w-4 text-outline-variant" />
              </Link>
            )) : <div className="py-8 text-center text-on-surface-variant">Sin deudas registradas</div>}
          </div>
        </DashboardCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* --- Widget 4: Alertas de stock --- */}
        <DashboardCard title="Alertas de Stock" icon={<AlertTriangle className="h-5 w-5 text-error" />} className="xl:col-span-1">
          <div className="space-y-3">
            {alertasStock.length > 0 ? alertasStock.map((s) => (
              <div key={`${s.codigo}-${s.local_id}`} className="flex items-center justify-between p-3 bg-surface-container-lowest border border-outline-variant rounded-lg">
                <div className="min-w-0 flex-1">
                  <p className="text-body-sm font-bold truncate">{s.nombre}</p>
                  <p className="text-body-xs text-on-surface-variant">{s.codigo}</p>
                </div>
                <div className="text-right ml-3">
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-label-xs font-bold uppercase",
                    s.stock <= 0 ? "bg-error/10 text-error" : "bg-warning/20 text-warning-dark"
                  )}>
                    {s.stock <= 0 ? 'Sin stock' : `Quedan: ${s.stock}`}
                  </span>
                  <p className="text-[10px] text-on-surface-variant mt-1">Mínimo: {s.stock_minimo}</p>
                </div>
              </div>
            )) : <div className="py-8 text-center text-on-surface-variant">Stock en niveles normales</div>}
          </div>
        </DashboardCard>

        {/* --- Widget 6: Compras impagas --- */}
        <DashboardCard title="Compras Impagas a Proveedores" icon={<CreditCard className="h-5 w-5 text-red-500" />} className="xl:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant">
                  <th className="pb-3 text-label-sm text-on-surface-variant uppercase">Proveedor / Factura</th>
                  <th className="pb-3 text-label-sm text-on-surface-variant uppercase text-center">Vencimiento</th>
                  <th className="pb-3 text-label-sm text-on-surface-variant uppercase text-right">Saldo Pendiente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {comprasVencidas.length > 0 ? comprasVencidas.map((c) => {
                  const esVencida = c.fecha_vencimiento && new Date(c.fecha_vencimiento) < new Date();
                  return (
                    <tr key={c.id} className="group hover:bg-surface-container-lowest transition-colors">
                      <td className="py-3">
                        <Link to={`/compras/${c.id}`} className="block">
                          <p className="text-body-sm font-bold group-hover:text-primary transition-colors">
                            {(c.proveedores as any)?.razon_social}
                          </p>
                          <p className="text-body-xs text-on-surface-variant">
                            Comp #{c.numero?.toString().padStart(6, '0')} {c.numero_factura ? `• Fact: ${c.numero_factura}` : ''}
                          </p>
                        </Link>
                      </td>
                      <td className="py-3 text-center">
                        <span className={cn(
                          "text-body-xs font-medium px-2 py-0.5 rounded",
                          esVencida ? "text-error bg-error/10" : "text-on-surface-variant bg-surface-container-low"
                        )}>
                          {c.fecha_vencimiento ? formatDate(c.fecha_vencimiento) : 'N/A'}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <p className="text-body-sm font-bold text-on-surface">{formatCurrency(c.saldo_pendiente)}</p>
                        <p className="text-[10px] text-on-surface-variant">Total: {formatCurrency(c.total)}</p>
                      </td>
                    </tr>
                  )
                }) : <tr><td colSpan={3} className="py-8 text-center text-on-surface-variant">No hay facturas pendientes</td></tr>}
              </tbody>
            </table>
          </div>
        </DashboardCard>
      </div>

      {/* --- Widget 7: Últimos movimientos de stock --- */}
      <DashboardCard title="Últimos Movimientos de Stock (Kardex)" icon={<History className="h-5 w-5 text-blue-500" />}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant">
                <th className="pb-3 text-label-sm text-on-surface-variant uppercase">Fecha</th>
                <th className="pb-3 text-label-sm text-on-surface-variant uppercase">Producto</th>
                <th className="pb-3 text-label-sm text-on-surface-variant uppercase text-center">Cant.</th>
                <th className="pb-3 text-label-sm text-on-surface-variant uppercase">Descripción</th>
                <th className="pb-3 text-label-sm text-on-surface-variant uppercase text-right">Stock Final</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {ultimoKardex.length > 0 ? ultimoKardex.map((k) => (
                <tr key={k.id} className="hover:bg-surface-container-lowest transition-colors">
                  <td className="py-2.5 text-body-xs text-on-surface-variant">
                    {new Date(k.created_at).toLocaleString([], { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-2.5 min-w-[150px]">
                    <p className="text-body-sm font-medium">{k.producto_nombre}</p>
                    <p className="text-[10px] text-on-surface-variant uppercase tracking-tighter">{k.producto_codigo}</p>
                  </td>
                  <td className="py-2.5 text-center">
                    <span className={cn(
                      "text-label-sm font-bold tabular",
                      k.cantidad > 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {k.cantidad > 0 ? `+${k.cantidad}` : k.cantidad}
                    </span>
                  </td>
                  <td className="py-2.5">
                    <p className="text-body-xs text-on-surface-variant italic truncate max-w-[200px]" title={k.descripcion}>
                      {k.descripcion || k.tipo}
                    </p>
                  </td>
                  <td className="py-2.5 text-right font-medium text-body-sm tabular">
                    {k.stock_resultante}
                  </td>
                </tr>
              )) : <tr><td colSpan={5} className="py-8 text-center text-on-surface-variant">Sin movimientos registrados</td></tr>}
            </tbody>
          </table>
        </div>
      </DashboardCard>

    </div>
  )
}

// --- Componentes Auxiliares ---

interface KPICardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: 'primary' | 'green' | 'blue' | 'orange' | 'purple' | 'red';
  subtitle: string;
}

const KPICard: React.FC<KPICardProps> = ({ title, value, icon, color, subtitle }) => {
  const colorClasses = {
    primary: 'text-primary bg-primary-container/10 border-primary/20',
    green: 'text-green-600 bg-green-50 border-green-100',
    blue: 'text-blue-600 bg-blue-50 border-blue-100',
    orange: 'text-orange-600 bg-orange-50 border-orange-100',
    purple: 'text-purple-600 bg-purple-50 border-purple-100',
    red: 'text-red-600 bg-red-50 border-red-100',
  }

  return (
    <div className={cn(
      "bg-white p-5 rounded-xl border flex flex-col gap-1 shadow-sm hover:shadow-md transition-all duration-300",
      colorClasses[color]
    )}>
      <div className="flex justify-between items-start mb-2">
        <span className="text-[10px] uppercase font-bold tracking-widest opacity-70">{title}</span>
        <div className={cn("p-1.5 rounded-lg", colorClasses[color])}>
          {icon}
        </div>
      </div>
      <h3 className="text-headline-sm font-bold text-on-surface">{formatCurrency(value)}</h3>
      <p className="text-[10px] text-on-surface-variant mt-auto opacity-80">{subtitle}</p>
    </div>
  )
}

interface DashboardCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const DashboardCard: React.FC<DashboardCardProps> = ({ title, icon, children, className }) => (
  <div className={cn("bg-white rounded-xl border border-outline-variant shadow-sm flex flex-col", className)}>
    <div className="px-5 py-4 border-b border-outline-variant flex items-center gap-3">
      {icon}
      <h4 className="text-headline-sm font-semibold text-on-surface">{title}</h4>
    </div>
    <div className="p-5 flex-1">
      {children}
    </div>
  </div>
)

export default Dashboard
