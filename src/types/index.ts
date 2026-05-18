export type UserRol = 'superadmin' | 'admin' | 'vendedor' | 'cajero' | 'visor'
export const TYPES_VERSION = '1.0.0'

export type VentaEstado =
  | 'presupuesto' | 'confirmado' | 'en_preparacion'
  | 'entregado' | 'facturado' | 'cobrado' | 'cancelado'

export type CompraEstado = 'borrador' | 'recibida' | 'pagada' | 'cancelada'

export type PagoMetodo =
  | 'efectivo' | 'transferencia' | 'tarjeta_debito'
  | 'tarjeta_credito' | 'cheque' | 'credito_cliente'

export type MovimientoTipo = 'ingreso' | 'egreso'

export interface Profile {
  id: string
  nombre: string
  email: string
  rol: UserRol
  activo: boolean
  created_at: string
  updated_at: string
}

export interface Local {
  id: string
  nombre: string
  direccion?: string
  telefono?: string
  email?: string
  activo: boolean
  created_at: string
}

export interface UsuarioLocal {
  id: string
  usuario_id: string
  local_id: string
  locales?: Local
}

export interface StockPorLocal {
  id: string
  producto_id: string
  local_id: string
  stock: number
  updated_at: string
}

export interface Cliente {
  id: string
  razon_social: string
  nombre_fantasia?: string
  cuit?: string
  email?: string
  telefono?: string
  direccion?: string
  localidad?: string
  limite_credito: number
  activo: boolean
  notas?: string
  created_at: string
  updated_at: string
}

export interface Proveedor {
  id: string
  razon_social: string
  nombre_fantasia?: string
  cuit?: string
  email?: string
  telefono?: string
  direccion?: string
  localidad?: string
  activo: boolean
  notas?: string
  created_at: string
  updated_at: string
}

export interface Producto {
  id: string
  codigo?: string
  nombre: string
  descripcion?: string
  precio: number
  costo: number
  stock: number // Legacy
  unidad: string
  es_servicio: boolean
  activo: boolean
  created_at: string
  updated_at: string
  // join con stock_por_local
  stock_actual?: number
}

export interface Venta {
  id: string
  numero: number
  cliente_id?: string
  vendedor_id?: string
  local_id: string
  estado: VentaEstado
  fecha: string
  fecha_entrega?: string
  subtotal: number
  descuento: number
  total: number
  saldo_pendiente: number
  notas?: string
  created_at: string
  updated_at: string
  // joins opcionales
  clientes?: Cliente
  profiles?: Profile
  venta_items?: VentaItem[]
}

export interface VentaItem {
  id: string
  venta_id: string
  producto_id?: string
  descripcion: string
  cantidad: number
  precio_unitario: number
  descuento: number
  subtotal: number
  created_at: string
  productos?: Producto
}

export interface Compra {
  id: string
  numero: number
  proveedor_id: string
  local_id: string
  receptor_id?: string
  estado: CompraEstado
  fecha: string
  fecha_vencimiento?: string
  numero_factura?: string
  subtotal: number
  total: number
  saldo_pendiente: number
  notas?: string
  created_at: string
  updated_at: string
  proveedores?: Proveedor
  compra_items?: CompraItem[]
}

export interface CompraItem {
  id: string
  compra_id: string
  producto_id?: string
  descripcion: string
  cantidad: number
  precio_unitario: number
  subtotal: number
  created_at: string
  productos?: Producto
}

export interface Pago {
  id: string
  cliente_id: string
  caja_sesion_id?: string
  local_id: string
  metodo: PagoMetodo
  monto: number
  fecha: string
  referencia?: string
  notas?: string
  created_at: string
}

export interface PagoProveedor {
  id: string
  proveedor_id: string
  caja_sesion_id?: string
  local_id: string
  metodo: PagoMetodo
  monto: number
  fecha: string
  referencia?: string
  notas?: string
  created_at: string
}

export interface CajaSesion {
  id: string
  cajero_id?: string
  local_id: string
  apertura_at: string
  cierre_at?: string
  monto_apertura: number
  monto_cierre_real?: number
  monto_cierre_sistema?: number
  diferencia?: number
  estado: 'abierta' | 'cerrada'
  notas?: string
}

export interface CajaMovimiento {
  id: string
  caja_sesion_id: string
  tipo: MovimientoTipo
  metodo: PagoMetodo
  monto: number
  descripcion: string
  pago_id?: string
  created_at: string
}

export interface MovimientoExtra {
  id: string
  tipo: MovimientoTipo
  categoria?: string
  monto: number
  descripcion: string
  fecha: string
  caja_sesion_id?: string
  comprobante?: string
  created_at: string
}

export interface VistaCuentaCorriente {
  cliente_id: string
  razon_social: string
  nombre_fantasia?: string
  limite_credito: number
  total_facturado: number
  total_pagado: number
  saldo_deudor: number
  credito_disponible: number
}

export interface VistaVentasResumen {
  estado: VentaEstado
  cantidad: number
  monto_total: number
  saldo_pendiente_total: number
}
