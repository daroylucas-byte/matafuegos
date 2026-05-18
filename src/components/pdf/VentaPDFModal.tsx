import React from 'react';
import { PDFViewer } from '@react-pdf/renderer';
import { X } from 'lucide-react';
import { VentaPDF } from './VentaPDF';
import type { AppConfig } from '../../contexts/ConfigContext';

interface VentaPDFModalProps {
  open: boolean;
  onClose: () => void;
  venta: any;
  config: AppConfig | null;
}

export const VentaPDFModal: React.FC<VentaPDFModalProps> = ({ open, onClose, venta, config }) => {
  if (!open || !venta) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 md:p-8 animate-in fade-in duration-200">
      <div className="bg-surface w-full max-w-6xl h-full flex flex-col rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant bg-surface-container-low">
          <h2 className="text-title-lg font-bold text-on-surface">Comprobante de Venta</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-surface-container-high rounded-full transition-colors text-on-surface-variant"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <div className="flex-1 bg-surface-container-lowest">
          <PDFViewer width="100%" height="100%" className="border-0">
            <VentaPDF venta={venta} config={config} />
          </PDFViewer>
        </div>
      </div>
    </div>
  );
};
