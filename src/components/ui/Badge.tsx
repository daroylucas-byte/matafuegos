import React from 'react'
import { type VentaEstado } from '../../types'
import { cn, getStatusBadgeClass } from '../../lib/utils'

interface BadgeProps {
  estado: VentaEstado
  className?: string
}

export const StatusBadge: React.FC<BadgeProps> = ({ estado, className }) => {
  return (
    <span
      className={cn(
        'px-2.5 py-0.5 rounded-full text-label-sm inline-flex items-center capitalize',
        getStatusBadgeClass(estado),
        className
      )}
    >
      {estado.replace('_', ' ')}
    </span>
  )
}
