import React, { useState, useEffect } from 'react';
import { useConfig } from '../contexts/ConfigContext';
import { supabase } from '../lib/supabase';
import { 
  Save, 
  Upload, 
  Palette, 
  Image as ImageIcon, 
  Loader2, 
  Building2, 
  MapPin, 
  Mail, 
  Phone
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn, formatCurrency } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { useLocal } from '../contexts/LocalContext';
import { FacturaEmitirModal } from '../components/FacturaEmitirModal';
import { Receipt } from 'lucide-react';

const Configuracion: React.FC = () => {
  const { config, refreshConfig } = useConfig();
  const { activeLocalId } = useLocal();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'app' | 'empresa' | 'arca'>('app');
  
  const [facturaLibreOpen, setFacturaLibreOpen] = useState(false);
  const [recentFacturas, setRecentFacturas] = useState<any[]>([]);
  const [loadingFacturas, setLoadingFacturas] = useState(false);

  const isArcaConfigured = activeLocalId && config?.servicios?.arca?.[activeLocalId]?.punto_venta;

  const fetchRecentFacturas = async () => {
    try {
      setLoadingFacturas(true);
      const { data, error } = await supabase
        .from('facturas_arca')
        .select('*')
        .eq('local_id', activeLocalId)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (!error && data) {
        setRecentFacturas(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingFacturas(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'arca' && activeLocalId) {
      fetchRecentFacturas();
    }
  }, [activeTab, activeLocalId]);
  
  const [formData, setFormData] = useState({
    nombre_app: '',
    color_primario: '#3525cd',
    color_secundario: '#006c49',
    logo_url: '',
    razon_social: '',
    cuit: '',
    direccion: '',
    email_empresa: '',
    telefono: ''
  });

  useEffect(() => {
    if (config) {
      setFormData({
        nombre_app: config.nombre_app || '',
        color_primario: config.color_primario || '#3525cd',
        color_secundario: config.color_secundario || '#006c49',
        logo_url: config.logo_url || '',
        razon_social: config.razon_social || '',
        cuit: config.cuit || '',
        direccion: config.direccion || '',
        email_empresa: config.email_empresa || '',
        telefono: config.telefono || ''
      });
    }
  }, [config]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('configuracion')
        .update({
          nombre_app: formData.nombre_app,
          color_primario: formData.color_primario,
          color_secundario: formData.color_secundario,
          logo_url: formData.logo_url,
          razon_social: formData.razon_social,
          cuit: formData.cuit,
          direccion: formData.direccion,
          email_empresa: formData.email_empresa,
          telefono: formData.telefono,
          updated_at: new Date().toISOString()
        })
        .eq('id', 1);

      if (error) throw error;
      
      toast.success('Configuración actualizada');
      await refreshConfig();
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('logos').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(fileName);
      setFormData(prev => ({ ...prev, logo_url: publicUrl }));
      toast.success('Logo subido');
    } catch (error: any) {
      toast.error('Error al subir: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-headline-lg font-bold text-on-surface">Configuración General</h1>
          <p className="text-body-lg text-on-surface-variant">Personaliza tu plataforma y gestiona la identidad de tu empresa.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-surface-container-low rounded-2xl border border-outline-variant w-fit">
        <button 
          onClick={() => setActiveTab('app')}
          className={cn(
            "px-6 py-2 rounded-xl text-label-md font-bold transition-all",
            activeTab === 'app' ? "bg-white shadow-sm text-primary" : "text-on-surface-variant hover:bg-white/50"
          )}
        >
          Apariencia
        </button>
        <button 
          onClick={() => setActiveTab('empresa')}
          className={cn(
            "px-6 py-2 rounded-xl text-label-md font-bold transition-all",
            activeTab === 'empresa' ? "bg-white shadow-sm text-primary" : "text-on-surface-variant hover:bg-white/50"
          )}
        >
          Empresa
        </button>
        {isArcaConfigured && (
          <button 
            onClick={() => setActiveTab('arca')}
            className={cn(
              "px-6 py-2 rounded-xl text-label-md font-bold transition-all",
              activeTab === 'arca' ? "bg-white shadow-sm text-primary" : "text-on-surface-variant hover:bg-white/50"
            )}
          >
            Factura Libre (ARCA)
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Form Area */}
        <div className="lg:col-span-2">
          {activeTab === 'app' && (
            <div className="bg-white rounded-3xl p-8 border border-outline-variant shadow-sm space-y-8">
              <div className="space-y-6">
                <div className="flex items-center gap-3 text-primary">
                  <Palette className="h-6 w-6" />
                  <h3 className="text-headline-sm font-bold text-on-surface">Identidad Visual</h3>
                </div>
                
                <div className="space-y-4">
                  <label className="text-label-md font-bold text-on-surface-variant">Nombre de la Aplicación</label>
                  <input
                    type="text"
                    value={formData.nombre_app}
                    onChange={e => setFormData(prev => ({ ...prev, nombre_app: e.target.value }))}
                    className="w-full p-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-label-md font-bold text-on-surface-variant">Color Primario</label>
                    <div className="flex gap-2">
                      <input type="color" value={formData.color_primario} onChange={e => setFormData(prev => ({ ...prev, color_primario: e.target.value }))} className="h-12 w-12 p-1 rounded-xl border border-outline-variant cursor-pointer" />
                      <input type="text" value={formData.color_primario} onChange={e => setFormData(prev => ({ ...prev, color_primario: e.target.value }))} className="flex-1 p-3 bg-surface-container-lowest border border-outline-variant rounded-xl font-mono" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-label-md font-bold text-on-surface-variant">Color Secundario</label>
                    <div className="flex gap-2">
                      <input type="color" value={formData.color_secundario} onChange={e => setFormData(prev => ({ ...prev, color_secundario: e.target.value }))} className="h-12 w-12 p-1 rounded-xl border border-outline-variant cursor-pointer" />
                      <input type="text" value={formData.color_secundario} onChange={e => setFormData(prev => ({ ...prev, color_secundario: e.target.value }))} className="flex-1 p-3 bg-surface-container-lowest border border-outline-variant rounded-xl font-mono" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-label-md font-bold text-on-surface-variant">Logotipo</label>
                  <div className="flex items-center gap-6 p-6 rounded-2xl border-2 border-dashed border-outline-variant bg-surface-container-lowest hover:border-primary/50 transition-colors">
                    <div className="h-24 w-24 rounded-2xl bg-white border border-outline-variant flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                      {formData.logo_url ? <img src={formData.logo_url} className="h-full w-full object-contain" /> : <ImageIcon className="h-10 w-10 text-outline" />}
                    </div>
                    <div className="space-y-3">
                      <p className="text-body-sm text-on-surface-variant">Sube un logo para personalizar tus facturas y el menú lateral.</p>
                      <label className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-on-primary font-bold shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer">
                        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        {uploading ? 'Subiendo...' : 'Cambiar Logo'}
                        <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <Button size="lg" onClick={handleSaveConfig} isLoading={loading} className="px-10">
                  <Save className="h-5 w-5 mr-2" /> Guardar Apariencia
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'empresa' && (
            <div className="bg-white rounded-3xl p-8 border border-outline-variant shadow-sm space-y-8">
              <div className="space-y-6">
                <div className="flex items-center gap-3 text-primary">
                  <Building2 className="h-6 w-6" />
                  <h3 className="text-headline-sm font-bold text-on-surface">Datos Fiscales y de Contacto</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-label-md font-bold text-on-surface-variant">Razón Social</label>
                    <input type="text" value={formData.razon_social} onChange={e => setFormData(prev => ({ ...prev, razon_social: e.target.value }))} className="w-full p-3 bg-surface-container-lowest border border-outline-variant rounded-xl outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-label-md font-bold text-on-surface-variant">CUIT</label>
                    <input type="text" value={formData.cuit} onChange={e => setFormData(prev => ({ ...prev, cuit: e.target.value }))} className="w-full p-3 bg-surface-container-lowest border border-outline-variant rounded-xl outline-none" />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-label-md font-bold text-on-surface-variant">Dirección Comercial</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-outline" />
                      <input type="text" value={formData.direccion} onChange={e => setFormData(prev => ({ ...prev, direccion: e.target.value }))} className="w-full pl-10 pr-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl outline-none" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-label-md font-bold text-on-surface-variant">Email de la Empresa</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-outline" />
                      <input type="email" value={formData.email_empresa} onChange={e => setFormData(prev => ({ ...prev, email_empresa: e.target.value }))} className="w-full pl-10 pr-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl outline-none" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-label-md font-bold text-on-surface-variant">Teléfono</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-outline" />
                      <input type="text" value={formData.telefono} onChange={e => setFormData(prev => ({ ...prev, telefono: e.target.value }))} className="w-full pl-10 pr-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl outline-none" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <Button size="lg" onClick={handleSaveConfig} isLoading={loading} className="px-10">
                  <Save className="h-5 w-5 mr-2" /> Guardar Datos de Empresa
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'arca' && (
            <div className="bg-white rounded-3xl p-8 border border-outline-variant shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-emerald-600">
                  <Receipt className="h-6 w-6" />
                  <h3 className="text-headline-sm font-bold text-on-surface">Facturación Libre ARCA</h3>
                </div>
                <Button 
                  onClick={() => setFacturaLibreOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-600/95 text-white rounded-xl shadow-md shadow-emerald-600/10"
                >
                  <Receipt className="h-4.5 w-4.5 mr-2" /> Nueva Factura Libre
                </Button>
              </div>

              <div className="bg-surface-container-low border border-outline-variant p-4 rounded-2xl flex gap-3 text-xs text-on-surface-variant">
                <Building2 className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <span className="font-bold block text-on-surface">Punto de Venta Activo: PV {config?.servicios?.arca?.[activeLocalId || '']?.punto_venta || '1'}</span>
                  <span>Las facturas emitidas desde esta pestaña se registrarán bajo la sucursal seleccionada actual y se enviarán al entorno de <b>{config?.servicios?.arca?.[activeLocalId || '']?.entorno === 'produccion' ? 'Producción' : 'Homologación (Test)'}</b>.</span>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-label-md font-bold text-on-surface-variant uppercase tracking-wider">Últimos comprobantes emitidos</h4>
                
                {loadingFacturas ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-outline" />
                  </div>
                ) : recentFacturas.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-outline-variant rounded-2xl space-y-2">
                    <Receipt className="h-10 w-10 text-outline mx-auto" />
                    <p className="text-body-md font-bold text-on-surface">No hay facturas libres registradas</p>
                    <p className="text-xs text-on-surface-variant max-w-sm mx-auto">Comienza emitiendo una nueva factura libre para ver su historial en este panel.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-outline-variant rounded-2xl">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-surface-container border-b border-outline-variant text-[11px] uppercase font-bold text-on-surface-variant">
                          <th className="px-4 py-3">Fecha</th>
                          <th className="px-4 py-3">Receptor</th>
                          <th className="px-4 py-3">Concepto</th>
                          <th className="px-4 py-3">Tipo</th>
                          <th className="px-4 py-3 text-right">Total</th>
                          <th className="px-4 py-3">CAE / Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant">
                        {recentFacturas.map((f: any) => (
                          <tr key={f.id} className="text-xs hover:bg-slate-50">
                            <td className="px-4 py-3 font-mono">{new Date(f.created_at).toLocaleDateString()}</td>
                            <td className="px-4 py-3 font-bold truncate max-w-[150px]">{f.receptor_razon_social}</td>
                            <td className="px-4 py-3 truncate max-w-[180px]">{f.concepto}</td>
                            <td className="px-4 py-3 uppercase font-semibold text-primary">{f.tipo_comprobante.replace('_', ' ')}</td>
                            <td className="px-4 py-3 text-right font-bold">{formatCurrency(f.total)}</td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col">
                                <span className={cn(
                                  "font-semibold text-[10px] uppercase px-2 py-0.5 rounded-full w-fit",
                                  f.estado === 'aprobada' ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"
                                )}>
                                  {f.estado}
                                </span>
                                {f.cae && <span className="font-mono text-[9px] text-slate-500 mt-0.5">CAE: {f.cae}</span>}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Preview Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-surface-container rounded-3xl p-6 border border-outline-variant shadow-sm space-y-6 sticky top-6">
            <h2 className="text-label-md font-bold text-on-surface-variant uppercase tracking-wider">Previsualización</h2>
            
            <div className="rounded-2xl bg-white border border-outline-variant overflow-hidden shadow-lg">
              <div className="h-10 bg-surface-container-high flex items-center px-4 gap-2 border-b border-outline-variant">
                <div className="w-2.5 h-2.5 rounded-full bg-error/30" />
                <div className="w-2.5 h-2.5 rounded-full bg-secondary/30" />
                <div className="w-2.5 h-2.5 rounded-full bg-primary/30" />
              </div>
              <div className="p-6 flex flex-col items-center text-center space-y-4">
                {formData.logo_url ? (
                  <img src={formData.logo_url} className="h-16 w-16 object-contain rounded-xl shadow-sm" />
                ) : (
                  <div className="h-16 w-16 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg" style={{ backgroundColor: formData.color_primario }}>
                    {formData.nombre_app.charAt(0) || 'G'}
                  </div>
                )}
                <div>
                  <h4 className="font-bold text-lg" style={{ color: formData.color_primario }}>{formData.nombre_app || 'App Name'}</h4>
                  <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-widest">{formData.razon_social || 'RAZON SOCIAL'}</p>
                </div>
                <div className="w-full h-10 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-md" style={{ backgroundColor: formData.color_secundario }}>
                  ACCION PRINCIPAL
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg shadow-inner border border-white/20" style={{ backgroundColor: formData.color_primario }} />
                <div className="flex-1">
                  <p className="text-label-sm font-bold text-on-surface">Color Primario</p>
                  <p className="text-[10px] font-mono text-on-surface-variant uppercase">{formData.color_primario}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg shadow-inner border border-white/20" style={{ backgroundColor: formData.color_secundario }} />
                <div className="flex-1">
                  <p className="text-label-sm font-bold text-on-surface">Color Secundario</p>
                  <p className="text-[10px] font-mono text-on-surface-variant uppercase">{formData.color_secundario}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <FacturaEmitirModal
        isOpen={facturaLibreOpen}
        onClose={() => setFacturaLibreOpen(false)}
        onSuccess={fetchRecentFacturas}
      />
    </div>
  );
};

export default Configuracion;
