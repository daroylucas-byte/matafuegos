import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format } from 'date-fns'

/**
 * Merges tailwind classes with clsx and tailwind-merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a number as ARS currency: "$ 1.234,56"
 */
export function formatCurrency(n: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

/**
 * Formats a date to "DD/MM/YYYY"
 */
export function formatDate(d: string | Date): string {
  return format(new Date(d), 'dd/MM/yyyy')
}

/**
 * Formats a datetime to "DD/MM/YYYY HH:mm"
 */
export function formatDatetime(d: string | Date): string {
  return format(new Date(d), 'dd/MM/yyyy HH:mm')
}

/**
 * Returns Tailwind classes for each venta estado
 */
export function getStatusBadgeClass(estado: string): string {
  switch (estado) {
    case 'presupuesto':
      return 'bg-[#F3F4F6] text-[#374151]'
    case 'confirmado':
      return 'bg-[#DBEAFE] text-[#1E40AF]'
    case 'en_preparacion':
      return 'bg-[#FEF3C7] text-[#92400E]'
    case 'entregado':
      return 'bg-[#EDE9FE] text-[#5B21B6]'
    case 'facturado':
      return 'bg-[#FFEDD5] text-[#9A3412]'
    case 'cobrado':
    case 'pagada':
      return 'bg-[#DCFCE7] text-[#166534]'
    case 'cancelado':
      return 'bg-[#FEE2E2] text-[#991B1B]'
    case 'recibida':
      return 'bg-[#FFEDD5] text-[#9A3412]'
    case 'borrador':
      return 'bg-[#F3F4F6] text-[#374151]'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}
