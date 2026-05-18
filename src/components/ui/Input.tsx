import React from 'react'
import { cn } from '../../lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label className="text-label-md text-on-surface">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            'input-base w-full',
            error && 'border-error focus-visible:border-error focus-visible:ring-error/30',
            className
          )}
          {...props}
        />
        {error && (
          <span className="text-body-sm text-error">
            {error}
          </span>
        )}
        {!error && helperText && (
          <span className="text-body-sm text-on-surface-variant">
            {helperText}
          </span>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
