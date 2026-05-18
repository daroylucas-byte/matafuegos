import React from 'react';
import { PDFViewer } from '@react-pdf/renderer';
import { X } from 'lucide-react';
import { CuentaCorrientePDF } from './CuentaCorrientePDF';
import type { AppConfig } from '../../contexts/ConfigContext';

interface CuentaCorrientePDFModalProps {
  open: boolean;
  onClose: () => void;
  entity: any;
  movimientos: any[];
  config: AppConfig | null;
  type: 'cliente' | 'proveedor';
}

export const CuentaCorrientePDFModal: React.FC<CuentaCorrientePDFModalProps> = ({ 
  open, onClose, entity, movimientos, config, type 
}) => {
  if (!open || !entity) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 md:p-8 animate-in fade-in duration-200">
      <div className="bg-surface w-full max-w-6xl h-full flex flex-col rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant bg-surface-container-low">
          <h2 className="text-title-lg font-bold text-on-surface">Estado de Cuenta - {type === 'cliente' ? 'Cliente' : 'Proveedor'}</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-surface-container-high rounded-full transition-colors text-on-surface-variant"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <div className="flex-1 bg-surface-container-lowest">
          <PDFViewer width="100%" height="100%" className="border-0">
            <CuentaCorrientePDF 
              entity={entity} 
              movimientos={movimientos} 
              config={config} 
              type={type} 
            />
          </PDFViewer>
        </div>
      </div>
    </div>
  );
};
