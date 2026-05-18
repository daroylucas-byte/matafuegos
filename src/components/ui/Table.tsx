import React from 'react'
import { cn } from '../../lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Column<T> {
  header: string
  accessor: keyof T | ((item: T) => React.ReactNode)
  align?: 'left' | 'right' | 'center'
  className?: string
}

interface TableProps<T> {
  data: T[]
  columns: Column<T>[]
  pagination?: {
    currentPage: number
    totalPages: number
    onPageChange: (page: number) => void
    pageSize: number
    onPageSizeChange: (size: number) => void
  }
  isLoading?: boolean
}

export function Table<T>({ data, columns, pagination, isLoading }: TableProps<T>) {
  return (
    <div className="w-full bg-surface-container-lowest rounded-lg border border-outline-variant overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-surface-container-low border-b border-outline-variant sticky top-0 z-10">
            <tr>
              {columns.map((column, i) => (
                <th
                  key={i}
                  className={cn(
                    'px-4 py-3 text-label-sm text-on-surface-variant font-semibold',
                    column.align === 'right' && 'text-right',
                    column.align === 'center' && 'text-center',
                    column.className
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-body-md text-on-surface-variant">
                  Cargando...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-body-md text-on-surface-variant">
                  No se encontraron resultados.
                </td>
              </tr>
            ) : (
              data.map((item, rowIndex) => (
                <tr key={rowIndex} className="table-row-hover">
                  {columns.map((column, colIndex) => {
                    const content = typeof column.accessor === 'function' 
                      ? column.accessor(item) 
                      : (item[column.accessor] as React.ReactNode)
                    
                    const isNumeric = typeof content === 'number' || (typeof content === 'string' && /^\$|[\d,.]+$/.test(content))

                    return (
                      <td
                        key={colIndex}
                        className={cn(
                          'px-4 py-3 text-body-md text-on-surface',
                          column.align === 'right' && 'text-right',
                          column.align === 'center' && 'text-center',
                          isNumeric && 'tabular',
                          column.className
                        )}
                      >
                        {content}
                      </td>
                    )
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div className="px-4 py-3 bg-surface-container-low border-t border-outline-variant flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-body-sm text-on-surface-variant">
              Filas por página:
            </span>
            <select
              value={pagination.pageSize}
              onChange={(e) => pagination.onPageSizeChange(Number(e.target.value))}
              className="bg-transparent text-body-sm text-on-surface focus:outline-none"
            >
              {[10, 20, 50].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-body-sm text-on-surface-variant">
              Página {pagination.currentPage} de {pagination.totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage <= 1}
                className="p-1 rounded hover:bg-surface-container-high disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage >= pagination.totalPages}
                className="p-1 rounded hover:bg-surface-container-high disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
