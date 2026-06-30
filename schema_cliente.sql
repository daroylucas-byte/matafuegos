-- ============================================================
-- SCHEMA COMPLETO - Matafuegos ERP
-- Generado el 2026-06-30
-- Para aplicar en: SQL Editor del proyecto nuevo de Supabase
-- ============================================================

-- ============================================================
-- 1. TIPOS ENUM
-- ============================================================

CREATE TYPE public.compra_estado AS ENUM ('borrador', 'recibida', 'pagada', 'cancelada');
CREATE TYPE public.movimiento_stock_tipo AS ENUM ('venta', 'compra', 'ajuste');
CREATE TYPE public.movimiento_tipo AS ENUM ('ingreso', 'egreso');
CREATE TYPE public.pago_metodo AS ENUM ('efectivo', 'transferencia', 'tarjeta_debito', 'tarjeta_credito', 'cheque', 'credito_cliente');
CREATE TYPE public.user_rol AS ENUM ('superadmin', 'admin', 'vendedor', 'cajero', 'visor');
CREATE TYPE public.venta_estado AS ENUM ('presupuesto', 'confirmado', 'en_preparacion', 'entregado', 'facturado', 'cobrado', 'cancelado');

-- ============================================================
-- 2. SECUENCIAS
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS public.audit_log_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.compras_numero_seq;
CREATE SEQUENCE IF NOT EXISTS public.config_promo_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.identidad_visual_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.informes_estrategia_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.promociones_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.transacciones_marketing_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.ventas_numero_seq;

-- ============================================================
-- 3. TABLAS (en orden de dependencias)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.locales (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  direccion text,
  telefono text,
  email text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT locales_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL,
  nombre text NOT NULL,
  email text NOT NULL,
  rol user_rol NOT NULL DEFAULT 'vendedor'::user_rol,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.configuracion (
  id integer NOT NULL CHECK (id = 1),
  nombre_app text NOT NULL DEFAULT 'Gestión Pro',
  color_primario text NOT NULL DEFAULT '#3525cd',
  color_secundario text NOT NULL DEFAULT '#006c49',
  logo_url text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  razon_social text,
  cuit text,
  direccion text,
  email_empresa text,
  telefono text,
  servicios jsonb NOT NULL DEFAULT '{}',
  CONSTRAINT configuracion_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.clientes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  razon_social text NOT NULL,
  nombre_fantasia text,
  cuit text,
  email text,
  telefono text,
  direccion text,
  localidad text,
  limite_credito numeric NOT NULL DEFAULT 0,
  activo boolean NOT NULL DEFAULT true,
  notas text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  ultimo_contacto_cobranza timestamp with time zone,
  estado_cobranza text DEFAULT 'normal' CHECK (estado_cobranza = ANY (ARRAY['normal','recordatorio_enviado','en_mora','judicial'])),
  iva_cond text DEFAULT 'consumidor_final' CHECK (iva_cond = ANY (ARRAY['consumidor_final','monotributo','responsable_inscripto','exento'])),
  CONSTRAINT clientes_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.proveedores (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  razon_social text NOT NULL,
  nombre_fantasia text,
  cuit text,
  email text,
  telefono text,
  direccion text,
  localidad text,
  activo boolean NOT NULL DEFAULT true,
  notas text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT proveedores_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.productos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  codigo text UNIQUE,
  nombre text NOT NULL,
  descripcion text,
  precio numeric NOT NULL DEFAULT 0,
  costo numeric NOT NULL DEFAULT 0,
  stock numeric NOT NULL DEFAULT 0,
  unidad text NOT NULL DEFAULT 'unidad',
  es_servicio boolean NOT NULL DEFAULT false,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  stock_minimo numeric NOT NULL DEFAULT 0,
  CONSTRAINT productos_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.usuario_locales (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL,
  local_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT usuario_locales_pkey PRIMARY KEY (id),
  CONSTRAINT usuario_locales_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.profiles(id),
  CONSTRAINT usuario_locales_local_id_fkey FOREIGN KEY (local_id) REFERENCES public.locales(id)
);

CREATE TABLE IF NOT EXISTS public.stock_por_local (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  producto_id uuid NOT NULL,
  local_id uuid NOT NULL,
  stock numeric NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT stock_por_local_pkey PRIMARY KEY (id),
  CONSTRAINT stock_por_local_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id),
  CONSTRAINT stock_por_local_local_id_fkey FOREIGN KEY (local_id) REFERENCES public.locales(id),
  CONSTRAINT stock_por_local_producto_id_local_id_key UNIQUE (producto_id, local_id)
);

CREATE TABLE IF NOT EXISTS public.ventas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  numero integer NOT NULL DEFAULT nextval('ventas_numero_seq') UNIQUE,
  cliente_id uuid,
  vendedor_id uuid,
  estado venta_estado NOT NULL DEFAULT 'presupuesto'::venta_estado,
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  fecha_entrega date,
  subtotal numeric NOT NULL DEFAULT 0,
  descuento numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  saldo_pendiente numeric NOT NULL DEFAULT 0,
  notas text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  local_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  CONSTRAINT ventas_pkey PRIMARY KEY (id),
  CONSTRAINT ventas_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id),
  CONSTRAINT ventas_vendedor_id_fkey FOREIGN KEY (vendedor_id) REFERENCES public.profiles(id),
  CONSTRAINT ventas_local_id_fkey FOREIGN KEY (local_id) REFERENCES public.locales(id)
);

CREATE TABLE IF NOT EXISTS public.venta_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  venta_id uuid NOT NULL,
  producto_id uuid,
  descripcion text NOT NULL,
  cantidad numeric NOT NULL,
  precio_unitario numeric NOT NULL,
  descuento numeric NOT NULL DEFAULT 0,
  subtotal numeric NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT venta_items_pkey PRIMARY KEY (id),
  CONSTRAINT venta_items_venta_id_fkey FOREIGN KEY (venta_id) REFERENCES public.ventas(id),
  CONSTRAINT venta_items_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id)
);

CREATE TABLE IF NOT EXISTS public.caja_sesiones (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  cajero_id uuid,
  apertura_at timestamp with time zone NOT NULL DEFAULT now(),
  cierre_at timestamp with time zone,
  monto_apertura numeric NOT NULL DEFAULT 0,
  monto_cierre_real numeric,
  monto_cierre_sistema numeric,
  diferencia numeric,
  estado text NOT NULL DEFAULT 'abierta' CHECK (estado = ANY (ARRAY['abierta','cerrada'])),
  notas text,
  local_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  CONSTRAINT caja_sesiones_pkey PRIMARY KEY (id),
  CONSTRAINT caja_sesiones_cajero_id_fkey FOREIGN KEY (cajero_id) REFERENCES public.profiles(id),
  CONSTRAINT caja_sesiones_local_id_fkey FOREIGN KEY (local_id) REFERENCES public.locales(id)
);

CREATE TABLE IF NOT EXISTS public.pagos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL,
  caja_sesion_id uuid,
  metodo pago_metodo NOT NULL DEFAULT 'efectivo'::pago_metodo,
  monto numeric NOT NULL CHECK (monto > 0),
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  referencia text,
  notas text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  local_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  CONSTRAINT pagos_pkey PRIMARY KEY (id),
  CONSTRAINT pagos_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id),
  CONSTRAINT pagos_caja_sesion_id_fkey FOREIGN KEY (caja_sesion_id) REFERENCES public.caja_sesiones(id),
  CONSTRAINT pagos_local_id_fkey FOREIGN KEY (local_id) REFERENCES public.locales(id)
);

CREATE TABLE IF NOT EXISTS public.pago_imputaciones (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  pago_id uuid NOT NULL,
  venta_id uuid NOT NULL,
  monto numeric NOT NULL CHECK (monto > 0),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT pago_imputaciones_pkey PRIMARY KEY (id),
  CONSTRAINT pago_imputaciones_pago_id_fkey FOREIGN KEY (pago_id) REFERENCES public.pagos(id),
  CONSTRAINT pago_imputaciones_venta_id_fkey FOREIGN KEY (venta_id) REFERENCES public.ventas(id)
);

CREATE TABLE IF NOT EXISTS public.caja_movimientos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  caja_sesion_id uuid NOT NULL,
  tipo movimiento_tipo NOT NULL,
  metodo pago_metodo NOT NULL DEFAULT 'efectivo'::pago_metodo,
  monto numeric NOT NULL CHECK (monto > 0),
  descripcion text NOT NULL,
  pago_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT caja_movimientos_pkey PRIMARY KEY (id),
  CONSTRAINT caja_movimientos_caja_sesion_id_fkey FOREIGN KEY (caja_sesion_id) REFERENCES public.caja_sesiones(id),
  CONSTRAINT caja_movimientos_pago_id_fkey FOREIGN KEY (pago_id) REFERENCES public.pagos(id)
);

CREATE TABLE IF NOT EXISTS public.movimientos_extra (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tipo movimiento_tipo NOT NULL,
  categoria text,
  monto numeric NOT NULL CHECK (monto > 0),
  descripcion text NOT NULL,
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  caja_sesion_id uuid,
  comprobante text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  local_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  CONSTRAINT movimientos_extra_pkey PRIMARY KEY (id),
  CONSTRAINT movimientos_extra_caja_sesion_id_fkey FOREIGN KEY (caja_sesion_id) REFERENCES public.caja_sesiones(id),
  CONSTRAINT movimientos_extra_local_id_fkey FOREIGN KEY (local_id) REFERENCES public.locales(id)
);

CREATE TABLE IF NOT EXISTS public.compras (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  numero integer NOT NULL DEFAULT nextval('compras_numero_seq') UNIQUE,
  proveedor_id uuid NOT NULL,
  receptor_id uuid,
  estado compra_estado NOT NULL DEFAULT 'borrador'::compra_estado,
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  fecha_vencimiento date,
  nro_comprobante text,
  subtotal numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  saldo_pendiente numeric NOT NULL DEFAULT 0,
  notas text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  local_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  tipo_comprobante text,
  numero_factura text,
  CONSTRAINT compras_pkey PRIMARY KEY (id),
  CONSTRAINT compras_proveedor_id_fkey FOREIGN KEY (proveedor_id) REFERENCES public.proveedores(id),
  CONSTRAINT compras_receptor_id_fkey FOREIGN KEY (receptor_id) REFERENCES public.profiles(id),
  CONSTRAINT compras_local_id_fkey FOREIGN KEY (local_id) REFERENCES public.locales(id)
);

CREATE TABLE IF NOT EXISTS public.compra_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  compra_id uuid NOT NULL,
  producto_id uuid,
  descripcion text NOT NULL,
  cantidad numeric NOT NULL,
  costo_unitario numeric NOT NULL,
  subtotal numeric NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  precio_unitario numeric NOT NULL DEFAULT 0,
  CONSTRAINT compra_items_pkey PRIMARY KEY (id),
  CONSTRAINT compra_items_compra_id_fkey FOREIGN KEY (compra_id) REFERENCES public.compras(id),
  CONSTRAINT compra_items_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id)
);

CREATE TABLE IF NOT EXISTS public.pagos_proveedores (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  proveedor_id uuid NOT NULL,
  caja_sesion_id uuid,
  metodo pago_metodo NOT NULL DEFAULT 'efectivo'::pago_metodo,
  monto numeric NOT NULL CHECK (monto > 0),
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  referencia text,
  notas text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  local_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  compra_prioritaria_id uuid,
  CONSTRAINT pagos_proveedores_pkey PRIMARY KEY (id),
  CONSTRAINT pagos_proveedores_proveedor_id_fkey FOREIGN KEY (proveedor_id) REFERENCES public.proveedores(id),
  CONSTRAINT pagos_proveedores_caja_sesion_id_fkey FOREIGN KEY (caja_sesion_id) REFERENCES public.caja_sesiones(id),
  CONSTRAINT pagos_proveedores_local_id_fkey FOREIGN KEY (local_id) REFERENCES public.locales(id),
  CONSTRAINT pagos_proveedores_compra_prioritaria_id_fkey FOREIGN KEY (compra_prioritaria_id) REFERENCES public.compras(id)
);

CREATE TABLE IF NOT EXISTS public.pago_proveedor_imputaciones (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  pago_id uuid NOT NULL,
  compra_id uuid NOT NULL,
  monto numeric NOT NULL CHECK (monto > 0),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT pago_proveedor_imputaciones_pkey PRIMARY KEY (id),
  CONSTRAINT pago_proveedor_imputaciones_pago_id_fkey FOREIGN KEY (pago_id) REFERENCES public.pagos_proveedores(id),
  CONSTRAINT pago_proveedor_imputaciones_compra_id_fkey FOREIGN KEY (compra_id) REFERENCES public.compras(id)
);

CREATE TABLE IF NOT EXISTS public.movimientos_stock (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  producto_id uuid NOT NULL,
  tipo movimiento_stock_tipo NOT NULL,
  cantidad numeric NOT NULL,
  stock_resultante numeric NOT NULL,
  referencia_id uuid,
  descripcion text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  local_id uuid,
  CONSTRAINT movimientos_stock_pkey PRIMARY KEY (id),
  CONSTRAINT movimientos_stock_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id),
  CONSTRAINT movimientos_stock_local_id_fkey FOREIGN KEY (local_id) REFERENCES public.locales(id)
);

CREATE TABLE IF NOT EXISTS public.chat_mensajes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sender_id uuid,
  local_id uuid,
  mensaje text NOT NULL,
  leido_por uuid[] DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT chat_mensajes_pkey PRIMARY KEY (id),
  CONSTRAINT chat_mensajes_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id),
  CONSTRAINT chat_mensajes_local_id_fkey FOREIGN KEY (local_id) REFERENCES public.locales(id)
);

CREATE TABLE IF NOT EXISTS public.cobranza_gestiones (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL,
  usuario_id uuid,
  canal text NOT NULL CHECK (canal = ANY (ARRAY['whatsapp','email','llamada','otro'])),
  tono text NOT NULL CHECK (tono = ANY (ARRAY['amigable','firme','urgente'])),
  mensaje text NOT NULL,
  saldo_al_momento numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT cobranza_gestiones_pkey PRIMARY KEY (id),
  CONSTRAINT cobranza_gestiones_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id),
  CONSTRAINT cobranza_gestiones_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.profiles(id)
);

CREATE TABLE IF NOT EXISTS public.facturas_arca (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  local_id uuid,
  venta_id uuid,
  tipo_comprobante character varying NOT NULL,
  receptor_tipo_doc character varying NOT NULL,
  receptor_cuit_dni character varying,
  receptor_razon_social character varying NOT NULL,
  receptor_iva_cond character varying NOT NULL,
  concepto text NOT NULL,
  neto_gravado numeric NOT NULL DEFAULT 0.00,
  iva_alicuota numeric NOT NULL DEFAULT 21.00,
  iva_monto numeric NOT NULL DEFAULT 0.00,
  total numeric NOT NULL DEFAULT 0.00,
  estado character varying NOT NULL DEFAULT 'pendiente',
  cae character varying,
  cae_vencimiento timestamp with time zone,
  error_mensaje text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc', now()),
  punto_venta integer NOT NULL DEFAULT 1,
  numero_comprobante integer,
  neto_no_gravado numeric NOT NULL DEFAULT 0,
  exento numeric NOT NULL DEFAULT 0,
  otros_tributos numeric NOT NULL DEFAULT 0,
  CONSTRAINT facturas_arca_pkey PRIMARY KEY (id),
  CONSTRAINT facturas_arca_local_id_fkey FOREIGN KEY (local_id) REFERENCES public.locales(id),
  CONSTRAINT facturas_arca_venta_id_fkey FOREIGN KEY (venta_id) REFERENCES public.ventas(id)
);

CREATE TABLE IF NOT EXISTS public.audit_log (
  id bigint NOT NULL DEFAULT nextval('audit_log_id_seq'),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid,
  user_email text,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id text,
  old_data jsonb,
  new_data jsonb,
  local_id uuid,
  CONSTRAINT audit_log_pkey PRIMARY KEY (id),
  CONSTRAINT audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT audit_log_local_id_fkey FOREIGN KEY (local_id) REFERENCES public.locales(id)
);

-- Módulo Marketing / Promociones IA
CREATE TABLE IF NOT EXISTS public.saldo_marketing (
  id integer NOT NULL DEFAULT 1 CHECK (id = 1),
  saldo numeric NOT NULL DEFAULT 0,
  CONSTRAINT saldo_marketing_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.transacciones_marketing (
  id bigint NOT NULL DEFAULT nextval('transacciones_marketing_id_seq'),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  tipo text NOT NULL CHECK (tipo = ANY (ARRAY['carga','generar_promos','generar_imagen','analizar_identidad','generar_estrategia'])),
  monto numeric NOT NULL,
  saldo_nuevo numeric NOT NULL,
  descripcion text,
  mp_payment_id text UNIQUE,
  CONSTRAINT transacciones_marketing_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.promociones (
  id bigint NOT NULL DEFAULT nextval('promociones_id_seq'),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  local_id uuid,
  texto_promo text NOT NULL,
  imagen_url text,
  estado text NOT NULL DEFAULT 'pendiente' CHECK (estado = ANY (ARRAY['pendiente','aprobada','rechazada','enviada'])),
  canal_envio text,
  enviada_at timestamp with time zone,
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  imagenes_meta jsonb,
  CONSTRAINT promociones_pkey PRIMARY KEY (id),
  CONSTRAINT promociones_local_id_fkey FOREIGN KEY (local_id) REFERENCES public.locales(id)
);

CREATE TABLE IF NOT EXISTS public.config_promo (
  id bigint NOT NULL DEFAULT nextval('config_promo_id_seq'),
  local_id uuid UNIQUE,
  instruccion_extra text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT config_promo_pkey PRIMARY KEY (id),
  CONSTRAINT config_promo_local_id_fkey FOREIGN KEY (local_id) REFERENCES public.locales(id)
);

CREATE TABLE IF NOT EXISTS public.identidad_visual (
  id bigint NOT NULL DEFAULT nextval('identidad_visual_id_seq'),
  local_id uuid UNIQUE,
  colores_predominantes text,
  tipografia_percibida text,
  estilo_general text,
  palabras_clave_visuales text,
  instrucciones_para_ia text,
  actualizado_at timestamp with time zone NOT NULL DEFAULT now(),
  tipo_imagen_producto text DEFAULT 'FOTOGRAFIA_REAL',
  CONSTRAINT identidad_visual_pkey PRIMARY KEY (id),
  CONSTRAINT identidad_visual_local_id_fkey FOREIGN KEY (local_id) REFERENCES public.locales(id)
);

CREATE TABLE IF NOT EXISTS public.informes_estrategia (
  id bigint NOT NULL DEFAULT nextval('informes_estrategia_id_seq'),
  created_at timestamp with time zone DEFAULT now(),
  local_id uuid NOT NULL,
  periodo text NOT NULL CHECK (periodo = ANY (ARRAY['semana','mes','trimestre'])),
  objetivo text NOT NULL,
  meta_valor numeric,
  informe jsonb NOT NULL,
  resumen_texto text,
  costo_creditos integer NOT NULL DEFAULT 800,
  CONSTRAINT informes_estrategia_pkey PRIMARY KEY (id),
  CONSTRAINT informes_estrategia_local_id_fkey FOREIGN KEY (local_id) REFERENCES public.locales(id)
);

-- ============================================================
-- 4. FUNCIONES Y RPCs
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE OR REPLACE FUNCTION public.handle_update_timestamp()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.mi_rol()
RETURNS user_rol LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT rol FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.profiles (id, nombre, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nombre', NEW.email), NEW.email);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_audit_log()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_record_id text;
  v_old_data  jsonb;
  v_new_data  jsonb;
  v_local_id  uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_record_id := (row_to_json(OLD) ->> 'id');
    v_old_data  := row_to_json(OLD)::jsonb;
    v_new_data  := NULL;
    v_local_id  := (row_to_json(OLD) ->> 'local_id')::uuid;
  ELSE
    v_record_id := (row_to_json(NEW) ->> 'id');
    v_old_data  := CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD)::jsonb ELSE NULL END;
    v_new_data  := row_to_json(NEW)::jsonb;
    v_local_id  := (row_to_json(NEW) ->> 'local_id')::uuid;
  END IF;

  INSERT INTO public.audit_log (user_id, user_email, action, table_name, record_id, old_data, new_data, local_id)
  VALUES (auth.uid(), auth.email(), TG_OP, TG_TABLE_NAME, v_record_id, v_old_data, v_new_data, v_local_id);

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.registrar_movimiento_stock(p_producto_id uuid, p_local_id uuid, p_cantidad numeric, p_tipo movimiento_stock_tipo, p_referencia_id uuid, p_descripcion text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_stock_nuevo NUMERIC;
  v_es_servicio BOOLEAN;
BEGIN
  SELECT es_servicio INTO v_es_servicio FROM productos WHERE id = p_producto_id;
  IF v_es_servicio THEN RETURN; END IF;

  INSERT INTO stock_por_local (producto_id, local_id, stock)
    VALUES (p_producto_id, p_local_id, GREATEST(p_cantidad, 0))
  ON CONFLICT (producto_id, local_id)
    DO UPDATE SET stock = GREATEST(stock_por_local.stock + p_cantidad, 0)
    RETURNING stock INTO v_stock_nuevo;

  IF v_stock_nuevo IS NULL THEN
    SELECT stock INTO v_stock_nuevo FROM stock_por_local
    WHERE producto_id = p_producto_id AND local_id = p_local_id;
  END IF;

  INSERT INTO movimientos_stock (producto_id, tipo, cantidad, stock_resultante, referencia_id, descripcion, local_id)
  VALUES (p_producto_id, p_tipo, p_cantidad, v_stock_nuevo, p_referencia_id, p_descripcion, p_local_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.recalcular_saldo_venta()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_venta_id       UUID;
  v_total          NUMERIC;
  v_total_imputado NUMERIC;
BEGIN
  v_venta_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.venta_id ELSE NEW.venta_id END;
  SELECT total INTO v_total FROM ventas WHERE id = v_venta_id;
  SELECT COALESCE(SUM(monto), 0) INTO v_total_imputado FROM pago_imputaciones WHERE venta_id = v_venta_id;
  UPDATE ventas SET
    saldo_pendiente = GREATEST(total - v_total_imputado, 0),
    estado = CASE
      WHEN (total - v_total_imputado) <= 0 AND estado != 'cancelado' THEN 'cobrado'
      WHEN estado = 'cobrado' AND (total - v_total_imputado) > 0 THEN 'entregado'
      ELSE estado END
  WHERE id = v_venta_id;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.recalcular_saldo_compra()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_compra_id      UUID;
  v_total          NUMERIC;
  v_total_imputado NUMERIC;
BEGIN
  v_compra_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.compra_id ELSE NEW.compra_id END;
  SELECT total INTO v_total FROM compras WHERE id = v_compra_id;
  SELECT COALESCE(SUM(monto), 0) INTO v_total_imputado
    FROM pago_proveedor_imputaciones WHERE compra_id = v_compra_id;
  UPDATE compras SET
    saldo_pendiente = GREATEST(total - v_total_imputado, 0),
    estado = CASE
      WHEN (total - v_total_imputado) <= 0 AND estado != 'cancelada' THEN 'pagada'
      WHEN estado = 'pagada' AND (total - v_total_imputado) > 0 THEN 'recibida'
      ELSE estado END
  WHERE id = v_compra_id;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_fix_saldo_cancelado()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.estado = 'cancelado' THEN
    NEW.saldo_pendiente := 0;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_ventas_stock()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  estados_activos venta_estado[] := ARRAY['confirmado','en_preparacion','entregado','facturado','cobrado']::venta_estado[];
  item RECORD;
BEGIN
  IF NEW.estado = 'confirmado' AND OLD.estado = 'presupuesto' THEN
    FOR item IN SELECT vi.producto_id, vi.cantidad, vi.descripcion FROM venta_items vi WHERE vi.venta_id = NEW.id AND vi.producto_id IS NOT NULL
    LOOP
      PERFORM registrar_movimiento_stock(item.producto_id, NEW.local_id, -item.cantidad, 'venta', NEW.id, 'Venta V-' || LPAD(NEW.numero::text, 7, '0') || ' — ' || item.descripcion);
    END LOOP;
  ELSIF NEW.estado = 'cancelado' AND OLD.estado = ANY(estados_activos) THEN
    FOR item IN SELECT vi.producto_id, vi.cantidad, vi.descripcion FROM venta_items vi WHERE vi.venta_id = NEW.id AND vi.producto_id IS NOT NULL
    LOOP
      PERFORM registrar_movimiento_stock(item.producto_id, NEW.local_id, item.cantidad, 'ajuste', NEW.id, 'Cancelación V-' || LPAD(NEW.numero::text, 7, '0') || ' — ' || item.descripcion);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_compra_items_stock()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_compra RECORD;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT numero, estado, local_id INTO v_compra FROM compras WHERE id = NEW.compra_id;
    IF v_compra.estado != 'cancelada' AND NEW.producto_id IS NOT NULL THEN
      PERFORM registrar_movimiento_stock(NEW.producto_id, v_compra.local_id, NEW.cantidad, 'compra', NEW.compra_id, 'Compra C-' || LPAD(v_compra.numero::text, 7, '0') || ' — ' || NEW.descripcion);
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT numero, estado, local_id INTO v_compra FROM compras WHERE id = OLD.compra_id;
    IF v_compra.estado != 'cancelada' AND OLD.producto_id IS NOT NULL THEN
      PERFORM registrar_movimiento_stock(OLD.producto_id, v_compra.local_id, -OLD.cantidad, 'ajuste', OLD.compra_id, 'Eliminación ítem C-' || LPAD(v_compra.numero::text, 7, '0') || ' — ' || OLD.descripcion);
    END IF;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_compras_cancelacion_stock()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  item RECORD;
BEGIN
  IF NEW.estado = 'cancelada' AND OLD.estado != 'cancelada' THEN
    FOR item IN SELECT ci.producto_id, ci.cantidad, ci.descripcion FROM compra_items ci WHERE ci.compra_id = NEW.id AND ci.producto_id IS NOT NULL
    LOOP
      PERFORM registrar_movimiento_stock(item.producto_id, NEW.local_id, -item.cantidad, 'ajuste', NEW.id, 'Cancelación C-' || LPAD(NEW.numero::text, 7, '0') || ' — ' || item.descripcion);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.aplicar_credito_proveedor(p_compra_id uuid)
RETURNS numeric LANGUAGE plpgsql AS $$
DECLARE
    v_proveedor_id UUID;
    v_saldo_compra NUMERIC;
    v_pago RECORD;
    v_monto_a_imputar NUMERIC;
    v_total_aplicado NUMERIC := 0;
BEGIN
    SELECT proveedor_id, saldo_pendiente INTO v_proveedor_id, v_saldo_compra
    FROM compras WHERE id = p_compra_id AND estado NOT IN ('borrador', 'cancelada');

    IF v_saldo_compra IS NULL OR v_saldo_compra <= 0 THEN RETURN 0; END IF;

    FOR v_pago IN
        SELECT p.id, p.monto - COALESCE(SUM(i.monto), 0) as saldo_disponible
        FROM pagos_proveedores p
        LEFT JOIN pago_proveedor_imputaciones i ON i.pago_id = p.id
        WHERE p.proveedor_id = v_proveedor_id
        GROUP BY p.id
        HAVING (p.monto - COALESCE(SUM(i.monto), 0)) > 0.01
        ORDER BY p.fecha ASC, p.created_at ASC
    LOOP
        v_monto_a_imputar := LEAST(v_saldo_compra, v_pago.saldo_disponible);
        INSERT INTO pago_proveedor_imputaciones (pago_id, compra_id, monto) VALUES (v_pago.id, p_compra_id, v_monto_a_imputar);
        v_saldo_compra := v_saldo_compra - v_monto_a_imputar;
        v_total_aplicado := v_total_aplicado + v_monto_a_imputar;
        IF v_saldo_compra <= 0 THEN EXIT; END IF;
    END LOOP;

    RETURN v_total_aplicado;
END;
$$;

CREATE OR REPLACE FUNCTION public.imputar_pago_proveedor_fifo(p_pago_id uuid)
RETURNS numeric LANGUAGE plpgsql AS $$
DECLARE
    v_proveedor_id UUID;
    v_compra_prioritaria_id UUID;
    v_monto_disponible NUMERIC;
    v_compra RECORD;
    v_monto_a_imputar NUMERIC;
    v_total_imputado NUMERIC := 0;
BEGIN
    SELECT proveedor_id, compra_prioritaria_id, monto - (SELECT COALESCE(SUM(monto), 0) FROM pago_proveedor_imputaciones WHERE pago_id = p_pago_id)
    INTO v_proveedor_id, v_compra_prioritaria_id, v_monto_disponible
    FROM pagos_proveedores WHERE id = p_pago_id;

    IF v_monto_disponible <= 0 THEN RETURN 0; END IF;

    IF v_compra_prioritaria_id IS NOT NULL THEN
        SELECT id, saldo_pendiente INTO v_compra FROM compras
        WHERE id = v_compra_prioritaria_id AND saldo_pendiente > 0 AND estado NOT IN ('borrador', 'cancelada');
        IF v_compra.id IS NOT NULL THEN
            v_monto_a_imputar := LEAST(v_monto_disponible, v_compra.saldo_pendiente);
            INSERT INTO pago_proveedor_imputaciones (pago_id, compra_id, monto) VALUES (p_pago_id, v_compra.id, v_monto_a_imputar);
            v_monto_disponible := v_monto_disponible - v_monto_a_imputar;
            v_total_imputado := v_total_imputado + v_monto_a_imputar;
        END IF;
    END IF;

    IF v_monto_disponible <= 0 THEN RETURN v_total_imputado; END IF;

    FOR v_compra IN
        SELECT id, saldo_pendiente FROM compras
        WHERE proveedor_id = v_proveedor_id
          AND id != COALESCE(v_compra_prioritaria_id, '00000000-0000-0000-0000-000000000000'::UUID)
          AND saldo_pendiente > 0 AND estado NOT IN ('borrador', 'cancelada')
        ORDER BY fecha ASC, created_at ASC
    LOOP
        v_monto_a_imputar := LEAST(v_monto_disponible, v_compra.saldo_pendiente);
        IF v_monto_a_imputar > 0 THEN
            INSERT INTO pago_proveedor_imputaciones (pago_id, compra_id, monto) VALUES (p_pago_id, v_compra.id, v_monto_a_imputar);
            v_monto_disponible := v_monto_disponible - v_monto_a_imputar;
            v_total_imputado := v_total_imputado + v_monto_a_imputar;
        END IF;
        IF v_monto_disponible <= 0 THEN EXIT; END IF;
    END LOOP;

    RETURN v_total_imputado;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_auto_imputar_compra()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.estado NOT IN ('borrador', 'cancelada') AND NEW.saldo_pendiente > 0 THEN
        PERFORM aplicar_credito_proveedor(NEW.id);
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_auto_imputar_pago()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    PERFORM imputar_pago_proveedor_fifo(NEW.id);
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.cargar_saldo(monto_carga numeric, descripcion_carga text DEFAULT 'Carga manual de saldo')
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_saldo_nuevo numeric;
BEGIN
  UPDATE saldo_marketing SET saldo = saldo + monto_carga WHERE id = 1 RETURNING saldo INTO v_saldo_nuevo;
  INSERT INTO transacciones_marketing (tipo, monto, saldo_nuevo, descripcion) VALUES ('carga', monto_carga, v_saldo_nuevo, descripcion_carga);
  RETURN v_saldo_nuevo;
END;
$$;

CREATE OR REPLACE FUNCTION public.descontar_saldo(monto_descuento numeric, tipo_descuento text, descripcion_descuento text DEFAULT NULL)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_saldo_actual numeric;
  v_saldo_nuevo  numeric;
BEGIN
  SELECT saldo INTO v_saldo_actual FROM saldo_marketing WHERE id = 1;
  IF v_saldo_actual < monto_descuento THEN
    RAISE EXCEPTION 'Saldo insuficiente. Saldo actual: %, requerido: %', v_saldo_actual, monto_descuento;
  END IF;
  UPDATE saldo_marketing SET saldo = saldo - monto_descuento WHERE id = 1 RETURNING saldo INTO v_saldo_nuevo;
  INSERT INTO transacciones_marketing (tipo, monto, saldo_nuevo, descripcion) VALUES (tipo_descuento, -monto_descuento, v_saldo_nuevo, descripcion_descuento);
  RETURN v_saldo_nuevo;
END;
$$;

CREATE OR REPLACE FUNCTION public.resumen_para_promo(p_local_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_productos_top      jsonb;
  v_stock_bajo         jsonb;
  v_ventas_recientes   jsonb;
  v_config             jsonb;
  v_identidad          jsonb;
BEGIN
  SELECT jsonb_agg(row_to_json(t)) INTO v_productos_top FROM (
    SELECT p.nombre, p.precio, SUM(vi.cantidad) AS cantidad_vendida
    FROM venta_items vi JOIN ventas v ON v.id = vi.venta_id JOIN productos p ON p.id = vi.producto_id
    WHERE v.local_id = p_local_id AND v.estado IN ('confirmado','entregado','cobrado','facturado') AND v.fecha >= current_date - interval '30 days'
    GROUP BY p.id, p.nombre, p.precio ORDER BY cantidad_vendida DESC LIMIT 10
  ) t;

  SELECT jsonb_agg(row_to_json(t)) INTO v_stock_bajo FROM (
    SELECT p.nombre, p.precio, s.stock AS stock_actual
    FROM stock_por_local s JOIN productos p ON p.id = s.producto_id
    WHERE s.local_id = p_local_id AND s.stock < 5 AND s.stock > 0 ORDER BY s.stock ASC LIMIT 10
  ) t;

  SELECT jsonb_agg(row_to_json(t)) INTO v_ventas_recientes FROM (
    SELECT DATE(v.fecha) AS dia, COUNT(*) AS cantidad_ventas, SUM(v.total) AS total_vendido
    FROM ventas v WHERE v.local_id = p_local_id AND v.estado IN ('confirmado','entregado','cobrado','facturado') AND v.fecha >= current_date - interval '7 days'
    GROUP BY DATE(v.fecha) ORDER BY dia DESC
  ) t;

  SELECT jsonb_build_object('nombre_app', nombre_app, 'razon_social', razon_social, 'direccion', direccion) INTO v_config FROM configuracion WHERE id = 1;
  SELECT jsonb_build_object('colores', colores_predominantes, 'estilo', estilo_general, 'instrucciones_ia', instrucciones_para_ia) INTO v_identidad FROM identidad_visual WHERE local_id = p_local_id;

  RETURN jsonb_build_object(
    'productos_top',    COALESCE(v_productos_top, '[]'),
    'stock_bajo',       COALESCE(v_stock_bajo, '[]'),
    'ventas_recientes', COALESCE(v_ventas_recientes, '[]'),
    'config_empresa',   COALESCE(v_config, '{}'),
    'identidad_visual', COALESCE(v_identidad, '{}')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.resumen_para_estrategia(p_local_id uuid, p_periodo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_dias            INTEGER;
  v_productos_top   JSONB;
  v_productos_bajos JSONB;
  v_sin_movimiento  JSONB;
  v_stock_bajo      JSONB;
  v_ventas_resumen  JSONB;
  v_config          JSONB;
  v_totales         JSONB;
BEGIN
  v_dias := CASE p_periodo WHEN 'semana' THEN 7 WHEN 'mes' THEN 30 WHEN 'trimestre' THEN 90 ELSE 30 END;

  SELECT jsonb_agg(row_to_json(t)) INTO v_productos_top FROM (
    SELECT p.id, p.nombre, p.precio, p.costo,
      ROUND(((p.precio - p.costo) / NULLIF(p.precio, 0)) * 100, 1) AS margen_pct,
      SUM(vi.cantidad) AS cantidad_vendida,
      SUM(vi.cantidad * vi.precio_unitario) AS total_facturado,
      SUM(vi.cantidad * (vi.precio_unitario - p.costo)) AS ganancia_estimada
    FROM venta_items vi JOIN ventas v ON v.id = vi.venta_id JOIN productos p ON p.id = vi.producto_id
    WHERE v.local_id = p_local_id AND v.estado IN ('confirmado','entregado','cobrado','facturado') AND v.fecha >= current_date - v_dias
    GROUP BY p.id, p.nombre, p.precio, p.costo ORDER BY total_facturado DESC LIMIT 15
  ) t;

  SELECT jsonb_agg(row_to_json(t)) INTO v_productos_bajos FROM (
    SELECT p.id, p.nombre, p.precio, p.costo,
      ROUND(((p.precio - p.costo) / NULLIF(p.precio, 0)) * 100, 1) AS margen_pct,
      SUM(vi.cantidad) AS cantidad_vendida
    FROM venta_items vi JOIN ventas v ON v.id = vi.venta_id JOIN productos p ON p.id = vi.producto_id
    WHERE v.local_id = p_local_id AND v.estado IN ('confirmado','entregado','cobrado','facturado') AND v.fecha >= current_date - v_dias
      AND p.costo > 0 AND ((p.precio - p.costo) / NULLIF(p.precio, 0)) < 0.20
    GROUP BY p.id, p.nombre, p.precio, p.costo ORDER BY margen_pct ASC LIMIT 10
  ) t;

  SELECT jsonb_agg(row_to_json(t)) INTO v_sin_movimiento FROM (
    SELECT p.id, p.nombre, p.precio, p.costo, s.stock
    FROM stock_por_local s JOIN productos p ON p.id = s.producto_id
    WHERE s.local_id = p_local_id AND s.stock > 0 AND p.activo = true
      AND NOT EXISTS (SELECT 1 FROM venta_items vi2 JOIN ventas v2 ON v2.id = vi2.venta_id
        WHERE vi2.producto_id = p.id AND v2.local_id = p_local_id AND v2.estado IN ('confirmado','entregado','cobrado','facturado') AND v2.fecha >= current_date - v_dias)
    ORDER BY s.stock DESC LIMIT 10
  ) t;

  SELECT jsonb_agg(row_to_json(t)) INTO v_stock_bajo FROM (
    SELECT p.nombre, s.stock, COALESCE(p.stock_minimo, 3) AS stock_minimo
    FROM stock_por_local s JOIN productos p ON p.id = s.producto_id
    WHERE s.local_id = p_local_id AND s.stock < COALESCE(p.stock_minimo, 3) AND s.stock >= 0
    ORDER BY s.stock ASC LIMIT 10
  ) t;

  SELECT jsonb_agg(row_to_json(t)) INTO v_ventas_resumen FROM (
    SELECT DATE(v.fecha) AS dia, COUNT(*) AS cantidad_ventas, SUM(v.total) AS total_vendido
    FROM ventas v WHERE v.local_id = p_local_id AND v.estado IN ('confirmado','entregado','cobrado','facturado') AND v.fecha >= current_date - v_dias
    GROUP BY DATE(v.fecha) ORDER BY dia ASC
  ) t;

  SELECT jsonb_build_object('total_ventas', COUNT(*), 'total_facturado', SUM(v.total), 'ticket_promedio', ROUND(AVG(v.total), 2), 'dias_analizados', v_dias)
  INTO v_totales FROM ventas v WHERE v.local_id = p_local_id AND v.estado IN ('confirmado','entregado','cobrado','facturado') AND v.fecha >= current_date - v_dias;

  SELECT jsonb_build_object('nombre_app', nombre_app, 'razon_social', razon_social, 'direccion', direccion) INTO v_config FROM configuracion WHERE id = 1;

  RETURN jsonb_build_object(
    'periodo_dias',   v_dias,
    'config_empresa', COALESCE(v_config,         '{}'),
    'totales',        COALESCE(v_totales,         '{}'),
    'productos_top',  COALESCE(v_productos_top,   '[]'),
    'margen_bajo',    COALESCE(v_productos_bajos,  '[]'),
    'sin_movimiento', COALESCE(v_sin_movimiento,   '[]'),
    'stock_bajo',     COALESCE(v_stock_bajo,       '[]'),
    'ventas_diarias', COALESCE(v_ventas_resumen,   '[]')
  );
END;
$$;

-- ============================================================
-- 5. TRIGGERS
-- ============================================================

-- Trigger handle_new_user en auth.users (lo crea Supabase, pero por si acaso)
CREATE OR REPLACE TRIGGER "on_auth_user_created"
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at
CREATE OR REPLACE TRIGGER "trg_clientes_updated_at" BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE OR REPLACE TRIGGER "trg_compras_updated_at" BEFORE UPDATE ON public.compras FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE OR REPLACE TRIGGER "trg_configuracion_updated_at" BEFORE UPDATE ON public.configuracion FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE OR REPLACE TRIGGER "trg_locales_updated_at" BEFORE UPDATE ON public.locales FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE OR REPLACE TRIGGER "trg_productos_updated_at" BEFORE UPDATE ON public.productos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE OR REPLACE TRIGGER "trg_profiles_updated_at" BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE OR REPLACE TRIGGER "trg_proveedores_updated_at" BEFORE UPDATE ON public.proveedores FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE OR REPLACE TRIGGER "trg_stock_por_local_updated_at" BEFORE UPDATE ON public.stock_por_local FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE OR REPLACE TRIGGER "trg_ventas_updated_at" BEFORE UPDATE ON public.ventas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE OR REPLACE TRIGGER "trigger_update_timestamp_facturas_arca" BEFORE UPDATE ON public.facturas_arca FOR EACH ROW EXECUTE FUNCTION public.handle_update_timestamp();

-- Lógica de negocio
CREATE OR REPLACE TRIGGER "trg_ventas_cancelado_saldo" BEFORE UPDATE ON public.ventas FOR EACH ROW EXECUTE FUNCTION public.trg_fix_saldo_cancelado();
CREATE OR REPLACE TRIGGER "trg_ventas_estado_stock" AFTER UPDATE ON public.ventas FOR EACH ROW EXECUTE FUNCTION public.trg_ventas_stock();
CREATE OR REPLACE TRIGGER "trg_pago_imputacion_cambio" AFTER INSERT OR UPDATE OR DELETE ON public.pago_imputaciones FOR EACH ROW EXECUTE FUNCTION public.recalcular_saldo_venta();
CREATE OR REPLACE TRIGGER "trg_pago_proveedor_imputacion_cambio" AFTER INSERT OR UPDATE OR DELETE ON public.pago_proveedor_imputaciones FOR EACH ROW EXECUTE FUNCTION public.recalcular_saldo_compra();
CREATE OR REPLACE TRIGGER "trg_compra_items_stock" AFTER INSERT OR DELETE ON public.compra_items FOR EACH ROW EXECUTE FUNCTION public.trg_compra_items_stock();
CREATE OR REPLACE TRIGGER "trg_compras_cancelacion_stock" AFTER UPDATE ON public.compras FOR EACH ROW EXECUTE FUNCTION public.trg_compras_cancelacion_stock();
CREATE OR REPLACE TRIGGER "trg_compra_auto_imputar" AFTER INSERT OR UPDATE ON public.compras FOR EACH ROW EXECUTE FUNCTION public.trg_auto_imputar_compra();
CREATE OR REPLACE TRIGGER "trg_pago_proveedor_auto_imputar" AFTER INSERT ON public.pagos_proveedores FOR EACH ROW EXECUTE FUNCTION public.trg_auto_imputar_pago();

-- Audit log
CREATE OR REPLACE TRIGGER "audit_ventas" AFTER INSERT OR UPDATE OR DELETE ON public.ventas FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();
CREATE OR REPLACE TRIGGER "audit_clientes" AFTER INSERT OR UPDATE OR DELETE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();
CREATE OR REPLACE TRIGGER "audit_compras" AFTER INSERT OR UPDATE OR DELETE ON public.compras FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();
CREATE OR REPLACE TRIGGER "audit_pagos" AFTER INSERT OR UPDATE OR DELETE ON public.pagos FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();
CREATE OR REPLACE TRIGGER "audit_productos" AFTER INSERT OR UPDATE OR DELETE ON public.productos FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();
CREATE OR REPLACE TRIGGER "audit_movimientos_stock" AFTER INSERT OR UPDATE OR DELETE ON public.movimientos_stock FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();
CREATE OR REPLACE TRIGGER "audit_facturas_arca" AFTER INSERT OR UPDATE OR DELETE ON public.facturas_arca FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();

-- ============================================================
-- 6. VISTAS
-- ============================================================

CREATE OR REPLACE VIEW public.clientes_con_saldo AS
  SELECT c.*, COALESCE(sum(v.saldo_pendiente), 0) AS saldo_deudor, count(v.id) FILTER (WHERE v.saldo_pendiente > 0) AS ventas_pendientes
  FROM clientes c LEFT JOIN ventas v ON (v.cliente_id = c.id AND v.estado <> 'cancelado'::venta_estado AND v.saldo_pendiente > 0)
  GROUP BY c.id;

CREATE OR REPLACE VIEW public.vista_cuenta_corriente AS
  SELECT c.id, c.razon_social, c.nombre_fantasia, c.limite_credito,
    COALESCE(v.total_ventas, 0) AS total_facturado,
    COALESCE(p.total_pagado, 0) AS total_pagado,
    (COALESCE(v.total_ventas, 0) - COALESCE(p.total_pagado, 0)) AS saldo_deudor,
    (c.limite_credito - (COALESCE(v.total_ventas, 0) - COALESCE(p.total_pagado, 0))) AS credito_disponible
  FROM clientes c
  LEFT JOIN (SELECT cliente_id, sum(total) AS total_ventas FROM ventas WHERE estado <> ALL(ARRAY['presupuesto'::venta_estado,'cancelado'::venta_estado]) GROUP BY cliente_id) v ON v.cliente_id = c.id
  LEFT JOIN (SELECT cliente_id, sum(monto) AS total_pagado FROM pagos GROUP BY cliente_id) p ON p.cliente_id = c.id;

CREATE OR REPLACE VIEW public.vista_cuenta_corriente_proveedores AS
  SELECT p.id, p.razon_social, p.nombre_fantasia,
    COALESCE(c.total_compras, 0) AS total_facturado,
    COALESCE(c.total_compras, 0) AS total_comprado,
    COALESCE(pg.total_pagado, 0) AS total_pagado,
    (COALESCE(c.total_compras, 0) - COALESCE(pg.total_pagado, 0)) AS saldo_deudor,
    (COALESCE(c.total_compras, 0) - COALESCE(pg.total_pagado, 0)) AS deuda_total
  FROM proveedores p
  LEFT JOIN (SELECT proveedor_id, sum(total) AS total_compras FROM compras WHERE estado <> ALL(ARRAY['borrador'::compra_estado,'cancelada'::compra_estado]) GROUP BY proveedor_id) c ON c.proveedor_id = p.id
  LEFT JOIN (SELECT proveedor_id, sum(monto) AS total_pagado FROM pagos_proveedores GROUP BY proveedor_id) pg ON pg.proveedor_id = p.id;

CREATE OR REPLACE VIEW public.vista_deuda_clientes_por_local AS
  SELECT c.id AS cliente_id, c.razon_social, c.nombre_fantasia, c.limite_credito, v.local_id, l.nombre AS local_nombre,
    COALESCE(sum(v.total), 0) AS total_facturado,
    COALESCE(sum(v.saldo_pendiente), 0) AS saldo_deudor
  FROM clientes c JOIN ventas v ON v.cliente_id = c.id JOIN locales l ON l.id = v.local_id
  WHERE v.estado <> ALL(ARRAY['presupuesto'::venta_estado,'cancelado'::venta_estado])
  GROUP BY c.id, c.razon_social, c.nombre_fantasia, c.limite_credito, v.local_id, l.nombre;

CREATE OR REPLACE VIEW public.vista_kardex AS
  SELECT ms.id, ms.producto_id, p.nombre AS producto_nombre, p.codigo AS producto_codigo,
    ms.tipo, ms.cantidad, ms.stock_resultante, ms.referencia_id, ms.local_id, l.nombre AS local_nombre, ms.descripcion, ms.created_at
  FROM movimientos_stock ms JOIN productos p ON p.id = ms.producto_id LEFT JOIN locales l ON l.id = ms.local_id
  ORDER BY ms.created_at DESC;

CREATE OR REPLACE VIEW public.vista_stock_por_local AS
  SELECT p.id AS producto_id, p.codigo, p.nombre, p.unidad, p.es_servicio, l.id AS local_id, l.nombre AS local_nombre,
    COALESCE(spl.stock, 0) AS stock
  FROM productos p CROSS JOIN locales l LEFT JOIN stock_por_local spl ON (spl.producto_id = p.id AND spl.local_id = l.id)
  WHERE p.activo = true AND l.activo = true AND p.es_servicio = false
  ORDER BY p.nombre, l.nombre;

CREATE OR REPLACE VIEW public.vista_productos_mas_vendidos AS
  SELECT vi.producto_id, p.nombre AS producto_nombre, p.codigo AS producto_codigo, p.unidad, v.local_id, l.nombre AS local_nombre, v.fecha,
    sum(vi.cantidad) AS cantidad_total, sum(vi.subtotal) AS monto_total
  FROM venta_items vi JOIN ventas v ON v.id = vi.venta_id JOIN productos p ON p.id = vi.producto_id JOIN locales l ON l.id = v.local_id
  WHERE v.estado <> ALL(ARRAY['presupuesto'::venta_estado,'cancelado'::venta_estado]) AND vi.producto_id IS NOT NULL
  GROUP BY vi.producto_id, p.nombre, p.codigo, p.unidad, v.local_id, l.nombre, v.fecha;

CREATE OR REPLACE VIEW public.vista_ventas_resumen AS
  SELECT estado, count(*) AS cantidad, sum(total) AS monto_total, sum(saldo_pendiente) AS saldo_pendiente_total
  FROM ventas GROUP BY estado;

CREATE OR REPLACE VIEW public.vista_caja_detalle AS
  SELECT cs.id AS sesion_id, cs.cajero_id, cs.apertura_at, cs.cierre_at, cs.estado AS sesion_estado, cs.monto_apertura,
    cm.id AS movimiento_id, cm.tipo, cm.metodo, cm.monto, cm.descripcion, cm.created_at AS movimiento_at
  FROM caja_sesiones cs LEFT JOIN caja_movimientos cm ON cm.caja_sesion_id = cs.id;

CREATE OR REPLACE VIEW public.vista_resumen_proveedores AS
  SELECT p.*, vccp.total_comprado, vccp.total_pagado, vccp.saldo_deudor, vccp.deuda_total
  FROM proveedores p LEFT JOIN vista_cuenta_corriente_proveedores vccp ON vccp.id = p.id;

CREATE OR REPLACE VIEW public.vista_queries_lentas AS
  SELECT left(query, 120) AS query_preview, calls, round(total_exec_time::numeric, 2) AS total_ms,
    round(mean_exec_time::numeric, 2) AS avg_ms, round(max_exec_time::numeric, 2) AS max_ms, rows
  FROM pg_stat_statements
  WHERE query !~~ '%pg_stat%' AND query !~~ '%information_schema%'
  ORDER BY mean_exec_time DESC LIMIT 20;

-- ============================================================
-- 7. RLS — HABILITAR EN TODAS LAS TABLAS
-- ============================================================

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caja_movimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caja_sesiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_mensajes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cobranza_gestiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compra_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config_promo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facturas_arca ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.identidad_visual ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.informes_estrategia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos_extra ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pago_imputaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pago_proveedor_imputaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos_proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promociones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saldo_marketing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_por_local ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transacciones_marketing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuario_locales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venta_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventas ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 8. POLÍTICAS RLS
-- ============================================================

CREATE POLICY "audit_log_insert_service" ON public.audit_log AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "audit_log_select_admins" ON public.audit_log AS PERMISSIVE FOR SELECT TO public USING ((EXISTS (SELECT 1 FROM profiles WHERE (profiles.id = auth.uid() AND profiles.rol = ANY (ARRAY['admin'::user_rol,'superadmin'::user_rol])))));
CREATE POLICY "escritura" ON public.caja_movimientos AS PERMISSIVE FOR ALL TO public USING ((mi_rol() = ANY (ARRAY['admin'::user_rol,'cajero'::user_rol])));
CREATE POLICY "lectura" ON public.caja_movimientos AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "escritura" ON public.caja_sesiones AS PERMISSIVE FOR ALL TO public USING ((mi_rol() = ANY (ARRAY['admin'::user_rol,'cajero'::user_rol])));
CREATE POLICY "lectura" ON public.caja_sesiones AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "usuarios activos pueden insertar mensajes" ON public.chat_mensajes AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = sender_id));
CREATE POLICY "usuarios activos pueden leer mensajes" ON public.chat_mensajes AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IN (SELECT profiles.id FROM profiles WHERE profiles.activo = true)));
CREATE POLICY "usuarios pueden marcar como leido" ON public.chat_mensajes AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() IN (SELECT profiles.id FROM profiles WHERE profiles.activo = true))) WITH CHECK ((auth.uid() IN (SELECT profiles.id FROM profiles WHERE profiles.activo = true)));
CREATE POLICY "escritura" ON public.clientes AS PERMISSIVE FOR ALL TO public USING ((mi_rol() = ANY (ARRAY['admin'::user_rol,'vendedor'::user_rol])));
CREATE POLICY "lectura" ON public.clientes AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "usuarios activos pueden insertar gestiones" ON public.cobranza_gestiones AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = usuario_id));
CREATE POLICY "usuarios activos pueden leer gestiones" ON public.cobranza_gestiones AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IN (SELECT profiles.id FROM profiles WHERE profiles.activo = true)));
CREATE POLICY "escritura" ON public.compra_items AS PERMISSIVE FOR ALL TO public USING ((mi_rol() = ANY (ARRAY['admin'::user_rol,'vendedor'::user_rol])));
CREATE POLICY "lectura" ON public.compra_items AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "escritura" ON public.compras AS PERMISSIVE FOR ALL TO public USING ((mi_rol() = ANY (ARRAY['admin'::user_rol,'vendedor'::user_rol])));
CREATE POLICY "lectura" ON public.compras AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "config_promo_all" ON public.config_promo AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Lectura pública de configuración" ON public.configuracion AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Solo admin puede editar configuración" ON public.configuracion AS PERMISSIVE FOR UPDATE TO public USING ((mi_rol() = 'admin'::user_rol));
CREATE POLICY "escritura" ON public.configuracion AS PERMISSIVE FOR ALL TO public USING ((mi_rol() = ANY (ARRAY['superadmin'::user_rol,'admin'::user_rol])));
CREATE POLICY "lectura" ON public.configuracion AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Permitir actualización a usuarios autenticados" ON public.facturas_arca AS PERMISSIVE FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Permitir inserción a usuarios autenticados" ON public.facturas_arca AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Permitir lectura a usuarios autenticados" ON public.facturas_arca AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "usuarios activos pueden leer facturas" ON public.facturas_arca AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IN (SELECT profiles.id FROM profiles WHERE profiles.activo = true)));
CREATE POLICY "usuarios admin pueden actualizar facturas" ON public.facturas_arca AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() IN (SELECT profiles.id FROM profiles WHERE profiles.activo = true AND profiles.rol = ANY (ARRAY['superadmin'::user_rol,'admin'::user_rol]))));
CREATE POLICY "usuarios admin pueden insertar facturas" ON public.facturas_arca AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() IN (SELECT profiles.id FROM profiles WHERE profiles.activo = true AND profiles.rol = ANY (ARRAY['superadmin'::user_rol,'admin'::user_rol,'vendedor'::user_rol]))));
CREATE POLICY "identidad_visual_all" ON public.identidad_visual AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "usuarios autenticados eliminan informes" ON public.informes_estrategia AS PERMISSIVE FOR DELETE TO authenticated USING (true);
CREATE POLICY "usuarios autenticados insertan informes" ON public.informes_estrategia AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "usuarios autenticados leen sus informes" ON public.informes_estrategia AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "escritura" ON public.locales AS PERMISSIVE FOR ALL TO public USING ((mi_rol() = ANY (ARRAY['superadmin'::user_rol,'admin'::user_rol])));
CREATE POLICY "lectura" ON public.locales AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "escritura" ON public.movimientos_extra AS PERMISSIVE FOR ALL TO public USING ((mi_rol() = 'admin'::user_rol));
CREATE POLICY "lectura" ON public.movimientos_extra AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "escritura" ON public.movimientos_stock AS PERMISSIVE FOR ALL TO public USING ((mi_rol() = 'admin'::user_rol));
CREATE POLICY "lectura" ON public.movimientos_stock AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "escritura" ON public.pago_imputaciones AS PERMISSIVE FOR ALL TO public USING ((mi_rol() = ANY (ARRAY['admin'::user_rol,'cajero'::user_rol])));
CREATE POLICY "lectura" ON public.pago_imputaciones AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "escritura" ON public.pago_proveedor_imputaciones AS PERMISSIVE FOR ALL TO public USING ((mi_rol() = ANY (ARRAY['admin'::user_rol,'cajero'::user_rol])));
CREATE POLICY "lectura" ON public.pago_proveedor_imputaciones AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "escritura" ON public.pagos AS PERMISSIVE FOR ALL TO public USING ((mi_rol() = ANY (ARRAY['admin'::user_rol,'cajero'::user_rol])));
CREATE POLICY "lectura" ON public.pagos AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "escritura" ON public.pagos_proveedores AS PERMISSIVE FOR ALL TO public USING ((mi_rol() = ANY (ARRAY['admin'::user_rol,'cajero'::user_rol])));
CREATE POLICY "lectura" ON public.pagos_proveedores AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "escritura" ON public.productos AS PERMISSIVE FOR ALL TO public USING ((mi_rol() = 'admin'::user_rol));
CREATE POLICY "lectura" ON public.productos AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "editar perfil" ON public.profiles AS PERMISSIVE FOR UPDATE TO public USING (((id = auth.uid()) OR (mi_rol() = 'admin'::user_rol)));
CREATE POLICY "trigger inserta perfil" ON public.profiles AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "ver perfil" ON public.profiles AS PERMISSIVE FOR SELECT TO public USING (((id = auth.uid()) OR (mi_rol() = 'admin'::user_rol)));
CREATE POLICY "promociones_all" ON public.promociones AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "promociones_select" ON public.promociones AS PERMISSIVE FOR SELECT TO public USING ((EXISTS (SELECT 1 FROM profiles WHERE (profiles.id = auth.uid() AND profiles.rol = ANY (ARRAY['admin'::user_rol,'superadmin'::user_rol])))));
CREATE POLICY "escritura" ON public.proveedores AS PERMISSIVE FOR ALL TO public USING ((mi_rol() = ANY (ARRAY['admin'::user_rol,'vendedor'::user_rol])));
CREATE POLICY "lectura" ON public.proveedores AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "saldo_marketing_all" ON public.saldo_marketing AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "escritura" ON public.stock_por_local AS PERMISSIVE FOR ALL TO public USING ((mi_rol() = ANY (ARRAY['superadmin'::user_rol,'admin'::user_rol,'vendedor'::user_rol])));
CREATE POLICY "lectura" ON public.stock_por_local AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "transacciones_marketing_all" ON public.transacciones_marketing AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "escritura" ON public.usuario_locales AS PERMISSIVE FOR ALL TO public USING ((mi_rol() = ANY (ARRAY['superadmin'::user_rol,'admin'::user_rol])));
CREATE POLICY "lectura" ON public.usuario_locales AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "escritura" ON public.venta_items AS PERMISSIVE FOR ALL TO public USING ((mi_rol() = ANY (ARRAY['admin'::user_rol,'vendedor'::user_rol])));
CREATE POLICY "lectura" ON public.venta_items AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "escritura" ON public.ventas AS PERMISSIVE FOR ALL TO public USING ((mi_rol() = ANY (ARRAY['admin'::user_rol,'vendedor'::user_rol])));
CREATE POLICY "lectura" ON public.ventas AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));

-- ============================================================
-- 9. DATOS INICIALES
-- ============================================================

INSERT INTO public.configuracion (id, nombre_app, color_primario, color_secundario)
VALUES (1, 'ERP Cliente', '#3525cd', '#006c49')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.saldo_marketing (id, saldo)
VALUES (1, 0)
ON CONFLICT (id) DO NOTHING;
