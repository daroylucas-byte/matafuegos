import React, { useState } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { MapPin, Phone, Mail } from 'lucide-react';

interface LocalFormProps {
  onSubmit: (data: {
    nombre: string;
    direccion: string;
    telefono: string;
    email: string;
  }) => Promise<void>;
  onCancel: () => void;
  initialData?: {
    nombre: string;
    direccion: string;
    telefono: string;
    email: string;
  };
  loading?: boolean;
}

export const LocalForm: React.FC<LocalFormProps> = ({ 
  onSubmit, 
  onCancel, 
  initialData,
  loading = false 
}) => {
  const [formData, setFormData] = useState({
    nombre: initialData?.nombre || '',
    direccion: initialData?.direccion || '',
    telefono: initialData?.telefono || '',
    email: initialData?.email || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim()) return;
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <Input
          label="Nombre de la Sucursal"
          placeholder="Ej: Sucursal Norte"
          value={formData.nombre}
          onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
          required
          autoFocus
        />

        <div className="relative">
          <Input
            label="Dirección"
            placeholder="Calle 123, Ciudad"
            value={formData.direccion}
            onChange={(e) => setFormData(prev => ({ ...prev, direccion: e.target.value }))}
            className="pl-10"
          />
          <MapPin className="absolute left-3 top-[38px] h-4 w-4 text-on-surface-variant" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Input
              label="Teléfono"
              placeholder="+54 ..."
              value={formData.telefono}
              onChange={(e) => setFormData(prev => ({ ...prev, telefono: e.target.value }))}
              className="pl-10"
            />
            <Phone className="absolute left-3 top-[38px] h-4 w-4 text-on-surface-variant" />
          </div>

          <div className="relative">
            <Input
              label="Email"
              type="email"
              placeholder="sucursal@ejemplo.com"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="pl-10"
            />
            <Mail className="absolute left-3 top-[38px] h-4 w-4 text-on-surface-variant" />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          isLoading={loading}
          disabled={!formData.nombre.trim()}
        >
          {initialData ? 'Guardar Cambios' : 'Crear Sucursal'}
        </Button>
      </div>
    </form>
  );
};
