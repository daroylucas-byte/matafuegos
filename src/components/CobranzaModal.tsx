import React, { useState, useEffect } from 'react'
import { 
  Phone, 
  Send, 
  Loader2,
  Smile,
  Shield,
  AlertCircle
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useConfig } from '../contexts/ConfigContext'
import { Modal } from './ui/Modal'
import { cn, formatCurrency } from '../lib/utils'
import type { ClienteConSaldo } from '../types'
import toast from 'react-hot-toast'

interface CobranzaModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  cliente: ClienteConSaldo
}

type TonoType = 'amigable' | 'firme' | 'urgente'

export const CobranzaModal: React.FC<CobranzaModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  cliente
}) => {
  const { profile } = useAuth()
  const { config } = useConfig()
  
  const [tono, setTono] = useState<TonoType>('amigable')
  const [mensaje, setMensaje] = useState('')
  const [loading, setLoading] = useState(false)

  const empresaNombre = config?.nombre_app || 'Matafuegos Lucas'

  // Predefined templates
  const getPlantilla = (tipoTono: TonoType) => {
    const nombreCliente = cliente.nombre_fantasia || cliente.razon_social
    const saldoFormateado = formatCurrency(cliente.saldo_deudor)

    switch (tipoTono) {
      case 'amigable':
        return `Hola ${nombreCliente}! 👋 Te contactamos desde ${empresaNombre}.\nNotamos que tenés un saldo pendiente de ${saldoFormateado} pesos.\nSi ya realizaste el pago, por favor ignorá este mensaje.\nCualquier consulta estamos a disposición. ¡Gracias!`
      
      case 'firme':
        return `Estimado/a ${cliente.razon_social}, le informamos que registra un saldo pendiente de ${saldoFormateado} pesos en su cuenta corriente.\nLe solicitamos regularizar su situación a la brevedad.\nPara coordinar el pago comuníquese con nosotros. Gracias.`
      
      case 'urgente':
        return `AVISO IMPORTANTE - ${cliente.razon_social}: Su cuenta presenta una deuda de ${saldoFormateado} pesos que supera los 30 días de vencimiento.\nDe no regularizarse en los próximos días, se procederá a la suspensión temporal del crédito. Comuníquese urgente con nosotros.`
    }
  }

  // Update message when tone changes
  useEffect(() => {
    if (cliente) {
      setMensaje(getPlantilla(tono))
    }
  }, [tono, cliente, config])

  // Get state code according to selected tone
  const getEstadoPorTono = (tipoTono: TonoType): 'recordatorio_enviado' | 'en_mora' => {
    if (tipoTono === 'amigable') return 'recordatorio_enviado'
    return 'en_mora'
  }

  // Save interaction details to Supabase & update client profile
  const registrarGestion = async (canal: 'whatsapp' | 'llamada') => {
    if (!profile?.id) {
      toast.error('Sesión no válida. Por favor, vuelve a iniciar sesión.')
      return false
    }

    try {
      setLoading(true)

      // 1. Insert interaction log into cobranza_gestiones
      const { error: insertError } = await supabase
        .from('cobranza_gestiones')
        .insert({
          cliente_id: cliente.id,
          usuario_id: profile.id,
          canal,
          tono,
          mensaje,
          saldo_al_momento: cliente.saldo_deudor
        })

      if (insertError) throw insertError

      // 2. Update client core attributes (ultimo_contacto_cobranza & estado_cobranza)
      const { error: updateError } = await supabase
        .from('clientes')
        .update({
          ultimo_contacto_cobranza: new Date().toISOString(),
          estado_cobranza: getEstadoPorTono(tono)
        })
        .eq('id', cliente.id)

      if (updateError) throw updateError

      return true
    } catch (err: any) {
      console.error('Error al registrar gestión:', err)
      toast.error('Error al registrar la gestión: ' + err.message)
      return false
    } finally {
      setLoading(false)
    }
  }

  const handleEnviarWhatsApp = async () => {
    if (!cliente.telefono) {
      toast.error('El cliente no tiene un teléfono registrado.')
      return
    }

    const success = await registrarGestion('whatsapp')
    if (success) {
      // Format telephone and country code
      const tel = cliente.telefono.replace(/\D/g, '')
      const telConPais = tel.startsWith('54') ? tel : `54${tel}`
      
      const whatsappUrl = `https://wa.me/${telConPais}?text=${encodeURIComponent(mensaje)}`
      
      // Open WhatsApp web / mobile application
      window.open(whatsappUrl, '_blank')
      
      toast.success('Gestión registrada y enlace de WhatsApp abierto.')
      onSuccess()
      onClose()
    }
  }

  const handleRegistrarLlamada = async () => {
    const success = await registrarGestion('llamada')
    if (success) {
      toast.success('Gestión de llamada telefónica registrada con éxito.')
      onSuccess()
      onClose()
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar Gestión de Cobranza"
      maxWidth="lg"
    >
      <div className="space-y-6">
        
        {/* SECCIÓN SUPERIOR: Client Card Details */}
        <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">Cliente / Razón Social</p>
            <h3 className="font-bold text-body-lg text-on-surface truncate">{cliente.razon_social}</h3>
            {cliente.nombre_fantasia && (
              <p className="text-xs text-on-surface-variant truncate">Fantástica: {cliente.nombre_fantasia}</p>
            )}
            <div className="flex items-center gap-1.5 mt-2 text-xs text-on-surface">
              <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>{cliente.telefono || 'Sin teléfono registrado'}</span>
            </div>
          </div>
          
          <div className="md:text-right flex flex-col md:justify-between md:items-end">
            <div>
              <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">Saldo Pendiente</p>
              <p className="text-headline-md font-extrabold text-error tabular">{formatCurrency(cliente.saldo_deudor)}</p>
            </div>
            {cliente.limite_credito > 0 && (
              <span className="text-[10px] text-on-surface-variant font-medium mt-1">
                Límite de crédito: {formatCurrency(cliente.limite_credito)}
              </span>
            )}
          </div>
        </div>

        {/* SECCIÓN TONO: Tones Selection Panel */}
        <div className="space-y-2">
          <label className="text-body-sm font-bold text-on-surface">Seleccionar Tono de Cobranza</label>
          <div className="grid grid-cols-3 gap-2">
            
            {/* Tone: Amigable */}
            <button
              type="button"
              onClick={() => setTono('amigable')}
              className={cn(
                "flex flex-col sm:flex-row items-center justify-center gap-2 p-3 border rounded-xl font-medium transition-all text-xs text-center sm:text-left",
                tono === 'amigable' 
                  ? "bg-emerald-50 border-emerald-300 text-emerald-800 ring-2 ring-emerald-300/30" 
                  : "bg-white border-outline-variant hover:bg-surface-container-low text-on-surface-variant"
              )}
            >
              <Smile className={cn("h-4.5 w-4.5 shrink-0", tono === 'amigable' ? "text-emerald-600" : "text-slate-400")} />
              <div>
                <span className="font-bold block sm:inline">😊 Amigable</span>
                <span className="text-[9px] block text-slate-500 font-normal">Deuda &lt; 15 días</span>
              </div>
            </button>

            {/* Tone: Firme */}
            <button
              type="button"
              onClick={() => setTono('firme')}
              className={cn(
                "flex flex-col sm:flex-row items-center justify-center gap-2 p-3 border rounded-xl font-medium transition-all text-xs text-center sm:text-left",
                tono === 'firme' 
                  ? "bg-amber-50 border-amber-300 text-amber-800 ring-2 ring-amber-300/30" 
                  : "bg-white border-outline-variant hover:bg-surface-container-low text-on-surface-variant"
              )}
            >
              <Shield className={cn("h-4.5 w-4.5 shrink-0", tono === 'firme' ? "text-amber-600" : "text-slate-400")} />
              <div>
                <span className="font-bold block sm:inline">⚖️ Firme</span>
                <span className="text-[9px] block text-slate-500 font-normal">Deuda 15-30 días</span>
              </div>
            </button>

            {/* Tone: Urgente */}
            <button
              type="button"
              onClick={() => setTono('urgente')}
              className={cn(
                "flex flex-col sm:flex-row items-center justify-center gap-2 p-3 border rounded-xl font-medium transition-all text-xs text-center sm:text-left",
                tono === 'urgente' 
                  ? "bg-error-container/30 border-error/30 text-error-container ring-2 ring-error-container/20" 
                  : "bg-white border-outline-variant hover:bg-surface-container-low text-on-surface-variant"
              )}
            >
              <AlertCircle className={cn("h-4.5 w-4.5 shrink-0", tono === 'urgente' ? "text-error" : "text-slate-400")} />
              <div>
                <span className="font-bold block sm:inline">⚠️ Urgente</span>
                <span className="text-[9px] block text-slate-500 font-normal">Deuda &gt; 30 días</span>
              </div>
            </button>

          </div>
        </div>

        {/* SECCIÓN MENSAJE: Custom Textarea Area */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-body-sm font-bold text-on-surface">Cuerpo del Mensaje a Enviar</label>
            <span className="text-[10px] text-on-surface-variant font-medium bg-surface-container px-2 py-0.5 rounded-md border">
              Mensaje Editable
            </span>
          </div>
          <textarea
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            disabled={loading}
            rows={5}
            className="w-full px-4 py-3 bg-surface-container-lowest border border-outline rounded-xl text-body-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-mono text-xs leading-relaxed disabled:opacity-60"
          />
        </div>

        {/* SECCIÓN ACCIONES: Buttons Footer */}
        <div className="pt-2 border-t border-outline-variant flex flex-col sm:flex-row sm:justify-end gap-2 shrink-0">
          
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-outline text-body-md font-semibold text-on-surface hover:bg-surface-container-low transition-colors select-none disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleRegistrarLlamada}
            disabled={loading}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-outline bg-surface-container-lowest text-body-md font-semibold text-primary hover:bg-primary-container/10 transition-colors flex items-center justify-center gap-2 select-none disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Phone className="h-4 w-4" />
            )}
            Registrar Llamada
          </button>

          <button
            type="button"
            onClick={handleEnviarWhatsApp}
            disabled={loading || !cliente.telefono}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-primary text-white text-body-md font-semibold hover:bg-primary/95 transition-all flex items-center justify-center gap-2 shadow-sm select-none active:scale-95 disabled:scale-100 disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Enviar por WhatsApp
          </button>

        </div>

      </div>
    </Modal>
  )
}
