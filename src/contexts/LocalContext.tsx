import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

import type { Local } from '../types';

interface LocalContextType {
  activeLocalId: string | null;
  activeLocalName: string;
  locales: Local[];
  loading: boolean;
  setActiveLocalId: (id: string | null) => void;
  isGlobalView: boolean;
  refreshLocales: () => Promise<void>;
}

const LocalContext = createContext<LocalContextType | undefined>(undefined);

export const LocalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locales, setLocales] = useState<Local[]>([]);
  const [activeLocalId, setActiveLocalId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { user, profile } = useAuth();

  useEffect(() => {
    if (user && profile) {
      fetchUserLocales();
    } else if (!user) {
      setLocales([]);
      setActiveLocalId(null);
      setLoading(false);
    }
  }, [user, profile]);

  const fetchUserLocales = async () => {
    try {
      if (!user || !profile) return;
      setLoading(true);

      let userLocalesList: Local[] = [];
      const userRole = profile?.rol?.toLowerCase();

      if (userRole === 'superadmin' || userRole === 'admin') {
        // Los admins ven todos los locales
        const { data: allLocs, error: allLocsError } = await supabase.from('locales').select('*').order('nombre');
        if (allLocsError) console.error('Error fetching all locales:', allLocsError);
        userLocalesList = allLocs || [];
      } else {
        // Los demás solo ven sus locales asignados
        const { data: userLocales, error } = await supabase
          .from('usuario_locales')
          .select(`
            local_id,
            locales (*)
          `)
          .eq('usuario_id', user.id);

        if (error) throw error;
        userLocalesList = (userLocales as any[]).map(ul => ul.locales).filter(Boolean);
      }

      setLocales(userLocalesList);

      // Lógica de selección por defecto
      if (userLocalesList.length === 1) {
        setActiveLocalId(userLocalesList[0].id);
      } else if (userLocalesList.length > 1) {
        const savedLocalId = localStorage.getItem('activeLocalId');
        if (savedLocalId && userLocalesList.find(l => l.id === savedLocalId)) {
          setActiveLocalId(savedLocalId);
        } else {
          // Si es admin, por defecto "Todos los locales" (null)
          if (userRole === 'superadmin' || userRole === 'admin') {
            setActiveLocalId(null);
          } else {
            setActiveLocalId(userLocalesList[0].id);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching user locales:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetActiveLocalId = (id: string | null) => {
    console.log('Cambiando local activo a:', id || 'Global (null)')
    setActiveLocalId(id);
    if (id) {
      localStorage.setItem('activeLocalId', id);
    } else {
      localStorage.removeItem('activeLocalId');
    }
  };

  const activeLocal = locales.find(l => l.id === activeLocalId);
  const activeLocalName = activeLocal ? activeLocal.nombre : 'Todos los locales';
  const isGlobalView = activeLocalId === null;

  return (
    <LocalContext.Provider value={{ 
      activeLocalId, 
      activeLocalName, 
      locales, 
      loading, 
      setActiveLocalId: handleSetActiveLocalId,
      isGlobalView,
      refreshLocales: fetchUserLocales
    }}>
      {children}
    </LocalContext.Provider>
  );
};

export const useLocal = () => {
  const context = useContext(LocalContext);
  if (context === undefined) {
    throw new Error('useLocal must be used within a LocalProvider');
  }
  return context;
};
