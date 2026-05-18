import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Users, 
  Shield, 
  Store, 
  Loader2,
  CheckCircle2,
  XCircle,
  UserCog,
  ShieldCheck,
  ShieldAlert,
  Search,
  Filter,
  UserPlus,
  Trash2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Button } from '../components/ui/Button';
import { cn } from '../lib/utils';
import type { Local } from '../types';

const ROLES = [
  { value: 'superadmin', label: 'Super Admin', color: 'text-error bg-error-container/10', icon: ShieldAlert },
  { value: 'admin', label: 'Administrador', color: 'text-primary bg-primary-container/10', icon: ShieldCheck },
  { value: 'vendedor', label: 'Vendedor', color: 'text-secondary bg-secondary-container/10', icon: UserCog }
];

const Usuarios: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [locales, setLocales] = useState<Local[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Obtener perfiles
      const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('*')
        .order('nombre');
      
      if (pError) throw pError;

      // 2. Obtener TODAS las relaciones usuario_locales
      const { data: rels, error: rError } = await supabase
        .from('usuario_locales')
        .select('usuario_id, local_id');
      
      if (rError) throw rError;

      // Unir datos
      const usersWithLocals = (profiles || []).map(u => ({
        ...u,
        locales_ids: (rels || [])
          .filter(r => r.usuario_id === u.id)
          .map(r => r.local_id)
      }));

      setUsers(usersWithLocals);

      // 3. Obtener locales para los selectores
      const { data: locs } = await supabase.from('locales').select('*').order('nombre');
      setLocales(locs || []);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateUser = async (userId: string, updates: any) => {
    setUpdatingId(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);
      
      if (error) throw error;
      toast.success('Perfil actualizado');
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updates } : u));
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleAddLocal = async (userId: string, localId: string) => {
    if (!localId) return;
    setUpdatingId(userId);
    try {
      const { error } = await supabase
        .from('usuario_locales')
        .insert({ usuario_id: userId, local_id: localId });
      
      if (error) throw error;
      toast.success('Sucursal asignada');
      
      setUsers(prev => prev.map(u => {
        if (u.id === userId) {
          return { ...u, locales_ids: [...u.locales_ids, localId] };
        }
        return u;
      }));
    } catch (err: any) {
      toast.error('Error al asignar sucursal');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRemoveLocal = async (userId: string, localId: string) => {
    setUpdatingId(userId);
    try {
      const { error } = await supabase
        .from('usuario_locales')
        .delete()
        .eq('usuario_id', userId)
        .eq('local_id', localId);
      
      if (error) throw error;
      toast.success('Sucursal removida');
      
      setUsers(prev => prev.map(u => {
        if (u.id === userId) {
          return { ...u, locales_ids: u.locales_ids.filter((id: string) => id !== localId) };
        }
        return u;
      }));
    } catch (err: any) {
      toast.error('Error al remover sucursal');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      (user.nombre?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.email?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesRole = roleFilter === 'all' || user.rol === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 px-4">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full border border-primary/20">
            <Shield className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Control de Acceso</span>
          </div>
          <h1 className="text-4xl font-black text-on-surface tracking-tight">Gestión de Usuarios</h1>
          <p className="text-lg text-on-surface-variant max-w-2xl font-medium">
            Administra los permisos, el estado activo y las múltiples sucursales de tu equipo.
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-2xl font-black text-primary leading-none">{users.length}</span>
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-tighter">Usuarios Totales</span>
          </div>
          <div className="h-10 w-[1px] bg-outline-variant mx-2" />
          <Button variant="primary" className="rounded-2xl px-6 h-12 shadow-lg shadow-primary/20 group">
            <UserPlus className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform" />
            Nuevo Usuario
          </Button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-surface-container-low p-4 rounded-3xl border border-outline-variant shadow-sm">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-on-surface-variant/50 group-focus-within:text-primary transition-colors" />
          <input 
            type="text"
            placeholder="Buscar por nombre o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 h-12 bg-surface-container-lowest border border-outline-variant rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-body-md"
          />
        </div>
        
        <div className="relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-on-surface-variant/50" />
          <select 
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full pl-12 pr-4 h-12 bg-surface-container-lowest border border-outline-variant rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none cursor-pointer text-body-md font-medium"
          >
            <option value="all">Todos los roles</option>
            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2 px-4 bg-secondary-container/10 border border-secondary/20 rounded-2xl text-secondary">
          <Users className="h-5 w-5" />
          <span className="text-label-md font-bold">{filteredUsers.length} usuarios filtrados</span>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-[32px] border border-outline-variant shadow-xl shadow-surface-container/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-surface-container-low/50 border-b border-outline-variant">
                <th className="px-8 py-6 text-label-md text-on-surface-variant uppercase tracking-widest font-black">Usuario</th>
                <th className="px-8 py-6 text-label-md text-on-surface-variant uppercase tracking-widest font-black">Acceso</th>
                <th className="px-8 py-6 text-label-md text-on-surface-variant uppercase tracking-widest font-black">Sucursales Permitidas</th>
                <th className="px-8 py-6 text-label-md text-on-surface-variant uppercase tracking-widest font-black text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/50">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-32 text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => {
                  const currentRole = ROLES.find(r => r.value === user.rol) || ROLES[2];
                  const Icon = currentRole.icon;
                  
                  return (
                    <tr key={user.id} className="hover:bg-primary/5 transition-all duration-300 group border-b border-outline-variant last:border-0">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "h-12 w-12 rounded-2xl flex items-center justify-center text-xl font-black border-2",
                            user.activo ? "bg-primary-container text-primary border-primary/20" : "bg-surface-container text-on-surface-variant border-outline-variant grayscale"
                          )}>
                            {user.nombre?.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <p className="font-bold text-on-surface">{user.nombre}</p>
                            <p className="text-xs text-on-surface-variant font-medium">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-1">
                          <div className={cn(
                            "inline-flex items-center gap-2 px-3 py-1 rounded-xl w-fit font-bold text-[10px] uppercase tracking-wider border shadow-sm",
                            currentRole.color,
                            "border-current/10"
                          )}>
                            <Icon className="h-3 w-3" />
                            {currentRole.label}
                          </div>
                          <select 
                            value={user.rol}
                            onChange={(e) => handleUpdateUser(user.id, { rol: e.target.value })}
                            className="bg-transparent border-0 text-[10px] font-bold text-on-surface-variant hover:text-primary outline-none cursor-pointer uppercase tracking-tighter"
                          >
                            {ROLES.map(role => (
                              <option key={role.value} value={role.value}>{role.label}</option>
                            ))}
                          </select>
                        </div>
                      </td>
                      
                      <td className="px-8 py-6">
                        <div className="space-y-3">
                          {/* Tags de locales actuales */}
                          <div className="flex flex-wrap gap-2">
                            {user.locales_ids.map((lid: string) => {
                              const local = locales.find(l => l.id === lid);
                              return (
                                <div key={lid} className="flex items-center gap-2 pl-3 pr-1 py-1 bg-surface-container rounded-full border border-outline-variant text-[10px] font-bold text-on-surface group/tag">
                                  <Store className="h-3 w-3 text-primary" />
                                  {local?.nombre || 'Desconocido'}
                                  <button 
                                    onClick={() => handleRemoveLocal(user.id, lid)}
                                    className="p-1 hover:bg-error/10 hover:text-error rounded-full transition-colors"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              );
                            })}
                            {user.locales_ids.length === 0 && (
                              <span className="text-[10px] font-bold text-error uppercase italic">Sin sucursales asignadas</span>
                            )}
                          </div>
                          
                          {/* Selector para agregar */}
                          <div className="flex items-center gap-2">
                            <select 
                              onChange={(e) => {
                                if (e.target.value) handleAddLocal(user.id, e.target.value);
                                e.target.value = '';
                              }}
                              className="bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-on-surface outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer w-full max-w-[180px]"
                            >
                              <option value="">+ Asignar Sucursal</option>
                              {locales
                                .filter(l => !user.locales_ids.includes(l.id))
                                .map(l => (
                                  <option key={l.id} value={l.id}>{l.nombre}</option>
                                ))
                              }
                            </select>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-8 py-6">
                        <div className="flex flex-col items-center justify-center gap-2">
                          {updatingId === user.id ? (
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                          ) : (
                            <button
                              onClick={() => handleUpdateUser(user.id, { activo: !user.activo })}
                              className={cn(
                                "flex flex-col items-center gap-1 transition-all hover:scale-110",
                                user.activo ? "text-success" : "text-on-surface-variant/40"
                              )}
                            >
                              {user.activo ? (
                                <CheckCircle2 className="h-8 w-8" />
                              ) : (
                                <XCircle className="h-8 w-8" />
                              )}
                              <span className="text-[10px] font-black uppercase tracking-widest">{user.activo ? 'Activo' : 'Inactivo'}</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-surface-container-high rounded-[32px] p-8 flex gap-6 items-center border border-outline-variant">
        <div className="h-16 w-16 rounded-2xl bg-secondary-container text-secondary flex items-center justify-center shrink-0">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-black text-on-surface tracking-tight uppercase">Multi-Sucursal</h3>
          <p className="text-on-surface-variant font-medium text-sm leading-relaxed max-w-4xl">
            Al asignar múltiples sucursales a un usuario, este podrá alternar entre ellas desde la barra superior. 
            Todas sus operaciones (ventas, stock, caja) quedarán registradas bajo la sucursal que tenga seleccionada en el momento.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Usuarios;
