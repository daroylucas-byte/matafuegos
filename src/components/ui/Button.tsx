import React from 'react'
import { cn } from '../../lib/utils'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    const variants = {
      primary: 'bg-primary-container text-on-primary hover:bg-primary-container/90',
      secondary: 'bg-secondary-container text-on-secondary-container hover:bg-secondary-container/90',
      ghost: 'bg-transparent text-on-surface hover:bg-surface-container',
      danger: 'bg-error text-on-error hover:bg-error/90',
    }

    const sizes = {
      sm: 'px-3 py-1.5 text-body-sm',
      md: 'px-4 py-2 text-body-md',
      lg: 'px-6 py-3 text-body-lg',
    }

    return (
      <button
        ref={ref}
        disabled={isLoading || disabled}
        className={cn(
          'inline-flex items-center justify-center rounded font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container/30 disabled:opacity-50 disabled:pointer-events-none',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
