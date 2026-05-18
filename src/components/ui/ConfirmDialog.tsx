import React from 'react'
import { Modal } from './Modal'
import { Button } from './Button'
import { AlertTriangle, Info } from 'lucide-react'
import { cn } from '../../lib/utils'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  title: string
  message: string
  onConfirm: () => void
  onCancel?: () => void
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'info'
  isLoading?: boolean
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'warning',
  isLoading
}) => {
  const handleCancel = () => {
    if (onCancel) onCancel()
    onClose()
  }

  const icon = variant === 'danger' || variant === 'warning' 
    ? <AlertTriangle className={cn("h-6 w-6", variant === 'danger' ? "text-error" : "text-tertiary")} />
    : <Info className="h-6 w-6 text-primary-container" />

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title={title}
      maxWidth="sm"
      footer={
        <>
          <Button variant="ghost" onClick={handleCancel} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button 
            variant={variant === 'danger' ? 'danger' : 'primary'} 
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-4">
        <div className="flex-shrink-0">
          {icon}
        </div>
        <div className="flex-1">
          <p className="text-body-md text-on-surface-variant">
            {message}
          </p>
        </div>
      </div>
    </Modal>
  )
}
