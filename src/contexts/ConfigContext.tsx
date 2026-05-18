import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface AppConfig {
  id: number;
  nombre_app: string;
  razon_social?: string;
  cuit?: string;
  direccion?: string;
  email_empresa?: string;
  telefono?: string;
  logo_url?: string;
  color_primario: string;
  color_secundario: string;
  servicios?: any;
  updated_at: string;
}

interface ConfigContextType {
  config: AppConfig | null;
  loading: boolean;
  refreshConfig: () => Promise<void>;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export const ConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('configuracion')
        .select('*')
        .eq('id', 1)
        .single();

      if (error) throw error;
      setConfig(data);
      applyTheme(data);
    } catch (error) {
      console.error('Error fetching app config:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyTheme = (data: AppConfig) => {
    const root = document.documentElement;
    root.style.setProperty('--color-primary', data.color_primario);
    root.style.setProperty('--color-secondary', data.color_secundario);
    
    // Update document title
    if (data.nombre_app) {
      document.title = data.nombre_app;
    }
  };

  useEffect(() => {
    fetchConfig();

    // Suscribirse a cambios en tiempo real
    const channel = supabase
      .channel('app_config_changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'configuracion', filter: 'id=eq.1' },
        (payload) => {
          const newConfig = payload.new as AppConfig;
          setConfig(newConfig);
          applyTheme(newConfig);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <ConfigContext.Provider value={{ config, loading, refreshConfig: fetchConfig }}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (context === undefined) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
};
