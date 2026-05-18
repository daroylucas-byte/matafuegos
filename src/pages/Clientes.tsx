import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  UserPlus, 
  Search, 
  Filter,
  Edit2,
  TrendingUp,
  Users,
  Receipt
} from 'lucide-react'
import { cn, formatCurrency } from '../lib/utils'
import { supabase } from '../lib/supabase'
import type { Cliente } from '../types'
import { Button } from '../components/ui/Button'
import { ClienteForm } from '../components/forms/ClienteForm'

const Clientes: React.FC = () => {
  const navigate = useNavigate()
  const [clientes, setClientes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [clienteEditar, setClienteEditar] = useState<Partial<Cliente> | undefined>(undefined)
  const [searchTerm, setSearchTerm] = useState('')

  const loadClientes = async () => {
    try {
      setLoading(true)
      let query = supabase.from('vista_cuenta_corriente').select('*')
      
      if (searchTerm) {
        query = query.ilike('razon_social', `%${searchTerm}%`)
      }
      
      const { data, error } = await query.order('razon_social')
      if (error) throw error
      setClientes(data || [])
    } catch (err: any) {
      console.error('Error cargando clientes:', err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadClientes()
  }, [searchTerm])

  const stats = {
    totalDeuda: clientes.reduce((acc, c) => acc + (c.saldo_deudor || 0), 0),
    clientesActivos: clientes.length,
    conDeuda: clientes.filter(c => (c.saldo_deudor || 0) > 0).length
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-headline-lg font-bold text-on-surface">Gestión de Clientes</h2>
          <p className="text-body-md text-on-surface-variant">Visualiza y administra la cartera de clientes y sus estados de cuenta.</p>
        </div>
        <Button size="lg" className="rounded-xl shadow-sm gap-2" onClick={() => { setClienteEditar(undefined); setFormOpen(true); }}>
          <UserPlus className="h-5 w-5" />
          Nuevo Cliente
        </Button>
      </div>

      <ClienteForm 
        open={formOpen} 
        onClose={() => setFormOpen(false)} 
        onSuccess={() => { setFormOpen(false); loadClientes(); }}
        clienteInicial={clienteEditar}
      />

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
        <div className="bg-white border border-outline-variant p-5 rounded-xl shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-on-surface-variant text-label-sm font-bold uppercase tracking-wider">Total Deuda Clientes</span>
            <div className="p-2 bg-error-container/10 text-error rounded-lg">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <p className="text-headline-md font-bold text-on-surface">{formatCurrency(stats.totalDeuda)}</p>
          <div className="flex items-center gap-1 mt-1 text-on-surface-variant">
            <span className="text-xs">Saldo total a cobrar</span>
          </div>
        </div>

        <div className="bg-white border border-outline-variant p-5 rounded-xl shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-on-surface-variant text-label-sm font-bold uppercase tracking-wider">Clientes Activos</span>
            <div className="p-2 bg-secondary-container/10 text-secondary rounded-lg">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <p className="text-headline-md font-bold text-on-surface">{stats.clientesActivos}</p>
          <div className="flex items-center gap-1 mt-1 text-secondary">
            <span className="text-xs font-semibold">En cartera</span>
          </div>
        </div>

        <div className="bg-white border border-outline-variant p-5 rounded-xl shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-on-surface-variant text-label-sm font-bold uppercase tracking-wider">Clientes con Deuda</span>
            <div className="p-2 bg-primary-container/10 text-primary rounded-lg">
              <Receipt className="h-5 w-5" />
            </div>
          </div>
          <p className="text-headline-md font-bold text-on-surface">{stats.conDeuda}</p>
          <div className="flex items-center gap-1 mt-1 text-primary">
            <span className="text-xs font-semibold">Para seguimiento</span>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-outline-variant shadow-sm">
        <div className="flex-1 min-w-[300px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-outline" />
          <input 
            type="text" 
            placeholder="Buscar por razón social, CUIT o ID..." 
            className="w-full pl-10 pr-4 py-2 border border-outline-variant rounded-lg text-body-md bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:border-primary transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="secondary" className="gap-2">
          <Filter className="h-4 w-4" />
          Filtros
        </Button>
      </div>

      {/* Data Table */}
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
                <th className="px-6 py-4 text-label-md text-on-surface-variant">Razón Social</th>
                <th className="px-6 py-4 text-label-md text-on-surface-variant">CUIT</th>
                <th className="px-6 py-4 text-label-md text-on-surface-variant text-right">Saldo Deudor</th>
                <th className="px-6 py-4 text-label-md text-on-surface-variant text-right">Límite</th>
                <th className="px-6 py-4 text-label-md text-on-surface-variant text-center">Estado</th>
                <th className="px-6 py-4 text-label-md text-on-surface-variant text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {clientes.length === 0 && !loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-on-surface-variant italic">
                    No se encontraron clientes.
                  </td>
                </tr>
              ) : (
                clientes.map((cliente) => (
                  <tr 
                    key={cliente.cliente_id || cliente.id} 
                    className="table-row-hover cursor-pointer"
                    onClick={() => navigate(`/clientes/${cliente.cliente_id || cliente.id}`)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-body-md font-bold text-on-surface">{cliente.razon_social}</span>
                        <span className="text-xs text-on-surface-variant">ID: {cliente.cliente_id?.toString().padStart(5, '0') || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-table-data tabular">{cliente.cuit || '—'}</td>
                    <td className={cn(
                      "px-6 py-4 text-table-data text-right font-bold tabular",
                      (cliente.saldo_deudor || 0) > 0 ? "text-error" : (cliente.saldo_deudor || 0) < 0 ? "text-secondary" : "text-on-surface-variant"
                    )}>
                      {formatCurrency(cliente.saldo_deudor || 0)}
                    </td>
                    <td className="px-6 py-4 text-table-data text-right tabular">{formatCurrency(cliente.limite_credito || 0)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                        (cliente.saldo_deudor || 0) > (cliente.limite_credito || 0) ? "bg-error-container text-on-error-container" : "bg-secondary-container text-on-secondary-container"
                      )}>
                        {(cliente.saldo_deudor || 0) > (cliente.limite_credito || 0) ? 'Excedido' : 'Normal'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-center gap-1">
                        <button 
                          onClick={() => { setClienteEditar(cliente); setFormOpen(true); }}
                          className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container-high rounded-lg transition-all"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Clientes
