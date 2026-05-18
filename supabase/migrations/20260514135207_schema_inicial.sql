-- ============================================================
-- EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_rol AS ENUM ('superadmin', 'admin', 'vendedor', 'cajero', 'visor');

CREATE TYPE venta_estado AS ENUM (
  'presupuesto', 'confirmado', 'en_preparacion',
  'entregado', 'facturado', 'cobrado', 'cancelado'
);

CREATE TYPE pago_metodo AS ENUM (
  'efectivo', 'transferencia', 'tarjeta_debito',
  'tarjeta_credito', 'cheque', 'credito_cliente'
);

CREATE TYPE movimiento_tipo AS ENUM ('ingreso', 'egreso');

-- ============================================================
-- PROFILES
-- ============================================================

CREATE TABLE profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre     TEXT NOT NULL,
  email      TEXT NOT NULL,
  rol        user_rol NOT NULL DEFAULT 'vendedor',
  activo     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nombre, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nombre', NEW.email), NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- CLIENTES
-- ============================================================

CREATE TABLE clientes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  razon_social    TEXT NOT NULL,
  nombre_fantasia TEXT,
  cuit            TEXT,
  email           TEXT,
  telefono        TEXT,
  direccion       TEXT,
  localidad       TEXT,
  limite_credito  NUMERIC(12,2) NOT NULL DEFAULT 0,
  activo          BOOLEAN NOT NULL DEFAULT true,
  notas           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- PROVEEDORES
-- ============================================================

CREATE TABLE proveedores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  razon_social    TEXT NOT NULL,
  nombre_fantasia TEXT,
  cuit            TEXT,
  email           TEXT,
  telefono        TEXT,
  direccion       TEXT,
  localidad       TEXT,
  activo          BOOLEAN NOT NULL DEFAULT true,
  notas           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- PRODUCTOS
-- ============================================================

CREATE TABLE productos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo      TEXT UNIQUE,
  nombre      TEXT NOT NULL,
  descripcion TEXT,
  precio      NUMERIC(12,2) NOT NULL DEFAULT 0,
  costo       NUMERIC(12,2) NOT NULL DEFAULT 0,
  stock       NUMERIC(12,3) NOT NULL DEFAULT 0,
  unidad      TEXT NOT NULL DEFAULT 'unidad',
  es_servicio BOOLEAN NOT NULL DEFAULT false,
  activo      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- CAJA SESIONES
-- ============================================================

CREATE TABLE caja_sesiones (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cajero_id            UUID REFERENCES profiles(id),
  apertura_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  cierre_at            TIMESTAMPTZ,
  monto_apertura       NUMERIC(12,2) NOT NULL DEFAULT 0,
  monto_cierre_real    NUMERIC(12,2),
  monto_cierre_sistema NUMERIC(12,2),
  diferencia           NUMERIC(12,2),
  estado               TEXT NOT NULL DEFAULT 'abierta',
  notas                TEXT,
  CONSTRAINT caja_estado_check CHECK (estado IN ('abierta', 'cerrada'))
);

-- ============================================================
-- VENTAS
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS ventas_numero_seq;

CREATE TABLE ventas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero          INTEGER NOT NULL DEFAULT nextval('ventas_numero_seq') UNIQUE,
  cliente_id      UUID REFERENCES clientes(id),
  vendedor_id     UUID REFERENCES profiles(id),
  estado          venta_estado NOT NULL DEFAULT 'presupuesto',
  fecha           DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_entrega   DATE,
  subtotal        NUMERIC(12,2) NOT NULL DEFAULT 0,
  descuento       NUMERIC(12,2) NOT NULL DEFAULT 0,
  total           NUMERIC(12,2) NOT NULL DEFAULT 0,
  saldo_pendiente NUMERIC(12,2) NOT NULL DEFAULT 0,
  notas           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- VENTA ITEMS
-- ============================================================

CREATE TABLE venta_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venta_id        UUID NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  producto_id     UUID REFERENCES productos(id),
  descripcion     TEXT NOT NULL,
  cantidad        NUMERIC(12,3) NOT NULL,
  precio_unitario NUMERIC(12,2) NOT NULL,
  descuento       NUMERIC(12,2) NOT NULL DEFAULT 0,
  subtotal        NUMERIC(12,2) NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- PAGOS
-- ============================================================

CREATE TABLE pagos (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id     UUID NOT NULL REFERENCES clientes(id),
  caja_sesion_id UUID REFERENCES caja_sesiones(id),
  metodo         pago_metodo NOT NULL DEFAULT 'efectivo',
  monto          NUMERIC(12,2) NOT NULL CHECK (monto > 0),
  fecha          DATE NOT NULL DEFAULT CURRENT_DATE,
  referencia     TEXT,
  notas          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE pago_imputaciones (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pago_id    UUID NOT NULL REFERENCES pagos(id) ON DELETE CASCADE,
  venta_id   UUID NOT NULL REFERENCES ventas(id),
  monto      NUMERIC(12,2) NOT NULL CHECK (monto > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- CAJA MOVIMIENTOS
-- ============================================================

CREATE TABLE caja_movimientos (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caja_sesion_id UUID NOT NULL REFERENCES caja_sesiones(id),
  tipo           movimiento_tipo NOT NULL,
  metodo         pago_metodo NOT NULL DEFAULT 'efectivo',
  monto          NUMERIC(12,2) NOT NULL CHECK (monto > 0),
  descripcion    TEXT NOT NULL,
  pago_id        UUID REFERENCES pagos(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- MOVIMIENTOS EXTRAORDINARIOS
-- ============================================================

CREATE TABLE movimientos_extra (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo           movimiento_tipo NOT NULL,
  categoria      TEXT,
  monto          NUMERIC(12,2) NOT NULL CHECK (monto > 0),
  descripcion    TEXT NOT NULL,
  fecha          DATE NOT NULL DEFAULT CURRENT_DATE,
  caja_sesion_id UUID REFERENCES caja_sesiones(id),
  comprobante    TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TRIGGERS updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_profiles_updated_at    BEFORE UPDATE ON profiles    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_clientes_updated_at    BEFORE UPDATE ON clientes    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_proveedores_updated_at BEFORE UPDATE ON proveedores FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_productos_updated_at   BEFORE UPDATE ON productos   FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_ventas_updated_at      BEFORE UPDATE ON ventas      FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- TRIGGER recalcular saldo_pendiente
-- ============================================================

CREATE OR REPLACE FUNCTION recalcular_saldo_venta()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
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

CREATE TRIGGER trg_pago_imputacion_cambio
  AFTER INSERT OR UPDATE OR DELETE ON pago_imputaciones
  FOR EACH ROW EXECUTE FUNCTION recalcular_saldo_venta();

-- ============================================================
-- VISTAS
-- ============================================================

CREATE VIEW vista_cuenta_corriente AS
SELECT
  c.id, c.razon_social, c.nombre_fantasia, c.limite_credito,
  COALESCE(v.total_ventas, 0)                                AS total_facturado,
  COALESCE(p.total_pagado, 0)                                AS total_pagado,
  COALESCE(v.total_ventas, 0) - COALESCE(p.total_pagado, 0) AS saldo_deudor,
  c.limite_credito - (COALESCE(v.total_ventas, 0) - COALESCE(p.total_pagado, 0)) AS credito_disponible
FROM clientes c
LEFT JOIN (SELECT cliente_id, SUM(total) AS total_ventas FROM ventas WHERE estado NOT IN ('presupuesto','cancelado') GROUP BY cliente_id) v ON v.cliente_id = c.id
LEFT JOIN (SELECT cliente_id, SUM(monto) AS total_pagado FROM pagos GROUP BY cliente_id) p ON p.cliente_id = c.id;

CREATE VIEW vista_ventas_resumen AS
SELECT estado, COUNT(*) AS cantidad, SUM(total) AS monto_total, SUM(saldo_pendiente) AS saldo_pendiente_total
FROM ventas GROUP BY estado;

CREATE VIEW vista_caja_detalle AS
SELECT cs.id AS sesion_id, cs.cajero_id, cs.apertura_at, cs.cierre_at, cs.estado AS sesion_estado,
  cs.monto_apertura, cm.id AS movimiento_id, cm.tipo, cm.metodo, cm.monto, cm.descripcion, cm.created_at AS movimiento_at
FROM caja_sesiones cs LEFT JOIN caja_movimientos cm ON cm.caja_sesion_id = cs.id;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores       ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas            ENABLE ROW LEVEL SECURITY;
ALTER TABLE venta_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE pago_imputaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE caja_sesiones     ENABLE ROW LEVEL SECURITY;
ALTER TABLE caja_movimientos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_extra ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION mi_rol()
RETURNS user_rol LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT rol FROM public.profiles WHERE id = auth.uid();
$$;

-- Profiles
CREATE POLICY "trigger inserta perfil" ON profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "ver perfil"             ON profiles FOR SELECT USING (id = auth.uid() OR mi_rol() = 'admin');
CREATE POLICY "editar perfil"          ON profiles FOR UPDATE USING (id = auth.uid() OR mi_rol() = 'admin');

-- Lectura autenticados
CREATE POLICY "lectura" ON clientes          FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "lectura" ON proveedores       FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "lectura" ON productos         FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "lectura" ON ventas            FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "lectura" ON venta_items       FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "lectura" ON pagos             FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "lectura" ON pago_imputaciones FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "lectura" ON caja_sesiones     FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "lectura" ON caja_movimientos  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "lectura" ON movimientos_extra FOR SELECT USING (auth.uid() IS NOT NULL);

-- Escritura por rol
CREATE POLICY "escritura" ON clientes          FOR ALL USING (mi_rol() IN ('admin','vendedor'));
CREATE POLICY "escritura" ON proveedores       FOR ALL USING (mi_rol() IN ('admin','vendedor'));
CREATE POLICY "escritura" ON productos         FOR ALL USING (mi_rol() = 'admin');
CREATE POLICY "escritura" ON ventas            FOR ALL USING (mi_rol() IN ('admin','vendedor'));
CREATE POLICY "escritura" ON venta_items       FOR ALL USING (mi_rol() IN ('admin','vendedor'));
CREATE POLICY "escritura" ON pagos             FOR ALL USING (mi_rol() IN ('admin','cajero'));
CREATE POLICY "escritura" ON pago_imputaciones FOR ALL USING (mi_rol() IN ('admin','cajero'));
CREATE POLICY "escritura" ON caja_sesiones     FOR ALL USING (mi_rol() IN ('admin','cajero'));
CREATE POLICY "escritura" ON caja_movimientos  FOR ALL USING (mi_rol() IN ('admin','cajero'));
CREATE POLICY "escritura" ON movimientos_extra FOR ALL USING (mi_rol() = 'admin');
