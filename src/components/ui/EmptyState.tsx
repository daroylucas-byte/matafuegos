import React from 'react'
import { type LucideIcon } from 'lucide-react'
import { Button } from './Button'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-surface-container-low rounded-xl border border-dashed border-outline-variant">
      <div className="p-4 bg-surface-container rounded-full mb-4">
        <Icon className="h-10 w-10 text-on-surface-variant opacity-60" />
      </div>
      <h3 className="text-headline-sm text-on-surface mb-2">
        {title}
      </h3>
      <p className="text-body-md text-on-surface-variant max-w-sm mb-6">
        {description}
      </p>
      {action && (
        <Button onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  )
}
