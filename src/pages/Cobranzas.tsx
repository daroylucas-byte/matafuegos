import React, { useState, useEffect } from 'react'
import { 
  Users, 
  AlertTriangle, 
  Search, 
  Filter, 
  DollarSign, 
  Calendar,
  ChevronRight,
  RefreshCw,
  Phone
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatCurrency, cn } from '../lib/utils'
import { Button } from '../components/ui/Button'
import { CobranzaModal } from '../components/CobranzaModal'
import type { ClienteConSaldo } from '../types'
import toast from 'react-hot-toast'

export const Cobranzas: React.FC = () => {
  const [clientes, setClientes] = useState<ClienteConSaldo[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterEstado, setFilterEstado] = useState<string>('todos')
  
  // Modal State
  const [selectedCliente, setSelectedCliente] = useState<ClienteConSaldo | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const loadClientesDeudores = async () => {
    try {
      setLoading(true)
      
      // Fetch from view clients_con_saldo
      const { data, error } = await supabase
        .from('clientes_con_saldo')
        .select('*')
        .gt('saldo_deudor', 0)
        
      if (error) throw error
      setClientes(data || [])
    } catch (err: any) {
      console.error('Error al cargar deudores:', err)
      toast.error('Error al cargar los clientes deudores: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadClientesDeudores()
  }, [])

  // Calculate elapsed days since last contact date
  const getDiasSinContacto = (fechaStr?: string) => {
    if (!fechaStr) return 'Sin contacto'
    
    const fecha = new Date(fechaStr)
    const hoy = new Date()
    
    const f1 = Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate())
    const f2 = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
    
    const diffTime = f2 - f1
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Hoy'
    if (diffDays === 1) return 'Ayer'
    return `Hace ${diffDays} días`
  }

  // Filter clients dynamically based on search bar and states dropdown
  const filteredClientes = clientes.filter(c => {
    const matchesSearch = 
      c.razon_social?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.nombre_fantasia?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.cuit?.includes(searchTerm)
      
    const matchesEstado = 
      filterEstado === 'todos' || 
      c.estado_cobranza === filterEstado
      
    return matchesSearch && matchesEstado
  })

  // KPI Calculations
  const stats = {
    totalEnMora: clientes.reduce((acc, c) => acc + (c.saldo_deudor || 0), 0),
    cantClientesConDeuda: clientes.length,
    cantCriticos: clientes.filter(c => c.estado_cobranza === 'en_mora' || c.estado_cobranza === 'judicial').length
  }

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'recordatorio_enviado':
        return {
          label: 'Recordatorio Enviado',
          classes: 'bg-amber-100 text-amber-800 border-amber-200'
        }
      case 'en_mora':
        return {
          label: 'En Mora',
          classes: 'bg-orange-100 text-orange-800 border-orange-200'
        }
      case 'judicial':
        return {
          label: 'Judicial',
          classes: 'bg-red-100 text-red-800 border-red-200 animate-pulse'
        }
      default:
        return {
          label: 'Normal',
          classes: 'bg-slate-100 text-slate-800 border-slate-200'
        }
    }
  }

  const handleOpenGestion = (cliente: ClienteConSaldo) => {
    setSelectedCliente(cliente)
    setModalOpen(true)
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Header Title Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-headline-lg font-bold text-on-surface">Gestión de Cobranzas</h2>
          <p className="text-body-md text-on-surface-variant">
            Seguimiento de cuentas corrientes y regularización de deudas pendientes.
          </p>
        </div>
        <Button 
          variant="secondary" 
          onClick={loadClientesDeudores}
          disabled={loading}
          className="rounded-xl gap-2 self-start md:self-auto border-outline-variant shadow-sm"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Actualizar Datos
        </Button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
        
        {/* KPI: Total en Mora */}
        <div className="bg-white border border-outline-variant p-5 rounded-xl shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-on-surface-variant text-label-sm font-bold uppercase tracking-wider">Total en Mora</span>
            <div className="p-2 bg-error-container/10 text-error rounded-lg">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <p className="text-headline-md font-extrabold text-error">{formatCurrency(stats.totalEnMora)}</p>
          <div className="flex items-center gap-1 mt-1 text-on-surface-variant">
            <span className="text-xs">Saldo adeudado activo en cartera</span>
          </div>
        </div>

        {/* KPI: Clientes con Deuda */}
        <div className="bg-white border border-outline-variant p-5 rounded-xl shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-on-surface-variant text-label-sm font-bold uppercase tracking-wider">Clientes con Deuda</span>
            <div className="p-2 bg-primary-container/10 text-primary rounded-lg">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <p className="text-headline-md font-bold text-on-surface">{stats.cantClientesConDeuda}</p>
          <div className="flex items-center gap-1 mt-1 text-primary">
            <span className="text-xs font-semibold">Cuentas corrientes activas</span>
          </div>
        </div>

        {/* KPI: Críticos (Mora/Judicial) */}
        <div className="bg-white border border-outline-variant p-5 rounded-xl shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-on-surface-variant text-label-sm font-bold uppercase tracking-wider">Estados Críticos</span>
            <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <p className="text-headline-md font-bold text-orange-600">{stats.cantCriticos}</p>
          <div className="flex items-center gap-1 mt-1 text-orange-600">
            <span className="text-xs font-semibold">En mora o proceso judicial</span>
          </div>
        </div>

      </div>

      {/* Filters Search Bar & State Selector */}
      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl border border-outline-variant shadow-sm">
        
        {/* Search Input */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-outline" />
          <input 
            type="text" 
            placeholder="Buscar deudor por razón social o CUIT..." 
            className="w-full pl-10 pr-4 py-2.5 border border-outline-variant rounded-lg text-body-md bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:border-primary transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* State Selection Dropdown */}
        <div className="w-full md:w-64 relative flex items-center">
          <Filter className="absolute left-3 h-4 w-4 text-outline pointer-events-none" />
          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-outline-variant rounded-lg text-body-md bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:border-primary appearance-none cursor-pointer"
          >
            <option value="todos">Todos los Estados</option>
            <option value="normal">Normal</option>
            <option value="recordatorio_enviado">Recordatorio Enviado</option>
            <option value="en_mora">En Mora</option>
            <option value="judicial">Judicial</option>
          </select>
        </div>

      </div>

      {/* Debtor Clients Table */}
      <div className="bg-white border border-outline-variant rounded-xl overflow-hidden shadow-sm relative">
        {loading && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead className="bg-surface-container-low border-b border-outline-variant">
              <tr>
                <th className="px-6 py-4 text-label-md text-on-surface-variant font-bold">Razón Social</th>
                <th className="px-6 py-4 text-label-md text-on-surface-variant font-bold">Teléfono</th>
                <th className="px-6 py-4 text-label-md text-on-surface-variant font-bold text-right">Saldo Deudor</th>
                <th className="px-6 py-4 text-label-md text-on-surface-variant font-bold text-center">Último Contacto</th>
                <th className="px-6 py-4 text-label-md text-on-surface-variant font-bold text-center">Estado</th>
                <th className="px-6 py-4 text-label-md text-on-surface-variant font-bold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {filteredClientes.length === 0 && !loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-on-surface-variant italic">
                    {searchTerm || filterEstado !== 'todos' 
                      ? 'No se encontraron deudores que coincidan con la búsqueda.' 
                      : '¡Excelente! No hay clientes con saldo deudor pendiente.'}
                  </td>
                </tr>
              ) : (
                filteredClientes.map((cliente) => {
                  const stateBadge = getEstadoBadge(cliente.estado_cobranza)
                  return (
                    <tr 
                      key={cliente.id} 
                      className="table-row-hover hover:bg-slate-50/50"
                    >
                      {/* Razón Social */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-body-md font-bold text-on-surface">{cliente.razon_social}</span>
                          {cliente.nombre_fantasia && (
                            <span className="text-xs text-on-surface-variant font-medium">
                              {cliente.nombre_fantasia}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Teléfono */}
                      <td className="px-6 py-4 text-table-data">
                        {cliente.telefono ? (
                          <div className="flex items-center gap-1.5 text-on-surface">
                            <Phone className="h-3.5 w-3.5 text-outline" />
                            <span>{cliente.telefono}</span>
                          </div>
                        ) : (
                          <span className="text-on-surface-variant italic text-xs">Sin teléfono</span>
                        )}
                      </td>

                      {/* Saldo Deudor */}
                      <td className="px-6 py-4 text-table-data text-right font-extrabold text-error tabular">
                        {formatCurrency(cliente.saldo_deudor || 0)}
                      </td>

                      {/* Días sin contacto */}
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex items-center gap-1.5 justify-center text-xs font-semibold text-on-surface-variant">
                          <Calendar className="h-3.5 w-3.5 text-outline" />
                          <span>{getDiasSinContacto(cliente.ultimo_contacto_cobranza)}</span>
                        </div>
                      </td>

                      {/* Estado Cobranza */}
                      <td className="px-6 py-4 text-center">
                        <span className={cn(
                          "px-2.5 py-1 border rounded-full text-[10px] font-bold uppercase tracking-wider",
                          stateBadge.classes
                        )}>
                          {stateBadge.label}
                        </span>
                      </td>

                      {/* Acciones */}
                      <td className="px-6 py-4 text-center">
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleOpenGestion(cliente)}
                          className="rounded-lg shadow-sm font-bold gap-1 text-xs"
                        >
                          Gestionar
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rendering Modal conditionally */}
      {selectedCliente && (
        <CobranzaModal
          isOpen={modalOpen}
          onClose={() => { setModalOpen(false); setSelectedCliente(null); }}
          onSuccess={loadClientesDeudores}
          cliente={selectedCliente}
        />
      )}

    </div>
  )
}

export default Cobranzas

