-- ============================================================
-- MULTI-LOCAL
--
-- Modelo:
--   - locales: sucursales del cliente
--   - usuario_locales: qué usuarios acceden a qué local
--   - stock_por_local: stock independiente por local (catálogo global)
--   - local_id en tablas operativas: ventas, compras, pagos,
--     pagos_proveedores, caja_sesiones, movimientos_extra
--   - superadmin agregado al enum user_rol
--
-- Tablas GLOBALES (sin local_id):
--   productos, clientes, proveedores, configuracion
-- ============================================================

-- ============================================================
-- 1. ENUM: agregar superadmin a user_rol
-- Debe committearse antes de usarse en políticas RLS
-- ============================================================

-- superadmin ya fue agregado en migración 20260515139900_superadmin_enum.sql

-- ============================================================
-- 2. TABLA LOCALES
-- ============================================================

CREATE TABLE locales (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      TEXT NOT NULL,
  direccion   TEXT,
  telefono    TEXT,
  email       TEXT,
  activo      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_locales_updated_at
  BEFORE UPDATE ON locales
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Local por defecto para datos existentes
INSERT INTO locales (id, nombre) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Local Principal');

-- ============================================================
-- 3. TABLA USUARIO_LOCALES
-- Relación usuario ↔ local (un usuario puede estar en varios)
-- ============================================================

CREATE TABLE usuario_locales (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  local_id   UUID NOT NULL REFERENCES locales(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (usuario_id, local_id)
);

-- ============================================================
-- 4. TABLA STOCK_POR_LOCAL
-- Catálogo global, stock independiente por local
-- ============================================================

CREATE TABLE stock_por_local (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  local_id    UUID NOT NULL REFERENCES locales(id) ON DELETE CASCADE,
  stock       NUMERIC(12,3) NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (producto_id, local_id)
);

CREATE TRIGGER trg_stock_por_local_updated_at
  BEFORE UPDATE ON stock_por_local
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Migrar stock actual de productos → stock_por_local (local principal)
INSERT INTO stock_por_local (producto_id, local_id, stock)
SELECT id, '00000000-0000-0000-0000-000000000001', stock
FROM productos
WHERE es_servicio = false;

-- ============================================================
-- 5. AGREGAR local_id A TABLAS OPERATIVAS
-- Todas con default al local principal para no romper datos existentes
-- ============================================================

ALTER TABLE ventas
  ADD COLUMN local_id UUID NOT NULL
    REFERENCES locales(id)
    DEFAULT '00000000-0000-0000-0000-000000000001';

ALTER TABLE compras
  ADD COLUMN local_id UUID NOT NULL
    REFERENCES locales(id)
    DEFAULT '00000000-0000-0000-0000-000000000001';

ALTER TABLE pagos
  ADD COLUMN local_id UUID NOT NULL
    REFERENCES locales(id)
    DEFAULT '00000000-0000-0000-0000-000000000001';

ALTER TABLE pagos_proveedores
  ADD COLUMN local_id UUID NOT NULL
    REFERENCES locales(id)
    DEFAULT '00000000-0000-0000-0000-000000000001';

ALTER TABLE caja_sesiones
  ADD COLUMN local_id UUID NOT NULL
    REFERENCES locales(id)
    DEFAULT '00000000-0000-0000-0000-000000000001';

ALTER TABLE movimientos_extra
  ADD COLUMN local_id UUID NOT NULL
    REFERENCES locales(id)
    DEFAULT '00000000-0000-0000-0000-000000000001';

-- ============================================================
-- 6. ACTUALIZAR TRIGGERS DE STOCK
-- Ahora usan stock_por_local en lugar de productos.stock
-- ============================================================

CREATE OR REPLACE FUNCTION registrar_movimiento_stock(
  p_producto_id    UUID,
  p_local_id       UUID,
  p_cantidad       NUMERIC,
  p_tipo           movimiento_stock_tipo,
  p_referencia_id  UUID,
  p_descripcion    TEXT
) RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  v_stock_nuevo NUMERIC;
  v_es_servicio BOOLEAN;
BEGIN
  SELECT es_servicio INTO v_es_servicio FROM productos WHERE id = p_producto_id;
  IF v_es_servicio THEN RETURN; END IF;

  -- Upsert en stock_por_local
  INSERT INTO stock_por_local (producto_id, local_id, stock)
    VALUES (p_producto_id, p_local_id, GREATEST(p_cantidad, 0))
  ON CONFLICT (producto_id, local_id)
    DO UPDATE SET stock = GREATEST(stock_por_local.stock + p_cantidad, 0)
    RETURNING stock INTO v_stock_nuevo;

  IF v_stock_nuevo IS NULL THEN
    SELECT stock INTO v_stock_nuevo FROM stock_por_local
    WHERE producto_id = p_producto_id AND local_id = p_local_id;
  END IF;

  INSERT INTO movimientos_stock
    (producto_id, tipo, cantidad, stock_resultante, referencia_id, descripcion)
  VALUES
    (p_producto_id, p_tipo, p_cantidad, v_stock_nuevo, p_referencia_id, p_descripcion);
END;
$$;

-- Trigger ventas: pasa local_id de la venta
CREATE OR REPLACE FUNCTION trg_ventas_stock()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  estados_activos venta_estado[] := ARRAY[
    'confirmado', 'en_preparacion', 'entregado', 'facturado', 'cobrado'
  ]::venta_estado[];
  item RECORD;
BEGIN
  IF NEW.estado = 'confirmado' AND OLD.estado = 'presupuesto' THEN
    FOR item IN
      SELECT vi.producto_id, vi.cantidad, vi.descripcion
      FROM venta_items vi
      WHERE vi.venta_id = NEW.id AND vi.producto_id IS NOT NULL
    LOOP
      PERFORM registrar_movimiento_stock(
        item.producto_id, NEW.local_id, -item.cantidad, 'venta',
        NEW.id, 'Venta V-' || LPAD(NEW.numero::text, 7, '0') || ' — ' || item.descripcion
      );
    END LOOP;

  ELSIF NEW.estado = 'cancelado' AND OLD.estado = ANY(estados_activos) THEN
    FOR item IN
      SELECT vi.producto_id, vi.cantidad, vi.descripcion
      FROM venta_items vi
      WHERE vi.venta_id = NEW.id AND vi.producto_id IS NOT NULL
    LOOP
      PERFORM registrar_movimiento_stock(
        item.producto_id, NEW.local_id, item.cantidad, 'ajuste',
        NEW.id, 'Cancelación V-' || LPAD(NEW.numero::text, 7, '0') || ' — ' || item.descripcion
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger compra_items: toma local_id de la compra padre
CREATE OR REPLACE FUNCTION trg_compra_items_stock()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_compra RECORD;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT numero, estado, local_id INTO v_compra FROM compras WHERE id = NEW.compra_id;
    IF v_compra.estado != 'cancelada' AND NEW.producto_id IS NOT NULL THEN
      PERFORM registrar_movimiento_stock(
        NEW.producto_id, v_compra.local_id, NEW.cantidad, 'compra',
        NEW.compra_id, 'Compra C-' || LPAD(v_compra.numero::text, 7, '0') || ' — ' || NEW.descripcion
      );
    END IF;

  ELSIF TG_OP = 'DELETE' THEN
    SELECT numero, estado, local_id INTO v_compra FROM compras WHERE id = OLD.compra_id;
    IF v_compra.estado != 'cancelada' AND OLD.producto_id IS NOT NULL THEN
      PERFORM registrar_movimiento_stock(
        OLD.producto_id, v_compra.local_id, -OLD.cantidad, 'ajuste',
        OLD.compra_id, 'Eliminación ítem C-' || LPAD(v_compra.numero::text, 7, '0') || ' — ' || OLD.descripcion
      );
    END IF;
  END IF;

  RETURN NULL;
END;
$$;

-- Trigger cancelación compra
CREATE OR REPLACE FUNCTION trg_compras_cancelacion_stock()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  item RECORD;
BEGIN
  IF NEW.estado = 'cancelada' AND OLD.estado != 'cancelada' THEN
    FOR item IN
      SELECT ci.producto_id, ci.cantidad, ci.descripcion
      FROM compra_items ci
      WHERE ci.compra_id = NEW.id AND ci.producto_id IS NOT NULL
    LOOP
      PERFORM registrar_movimiento_stock(
        item.producto_id, NEW.local_id, -item.cantidad, 'ajuste',
        NEW.id, 'Cancelación C-' || LPAD(NEW.numero::text, 7, '0') || ' — ' || item.descripcion
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================
-- 7. ACTUALIZAR CONFIGURACION: agregar campos de empresa
-- ============================================================

ALTER TABLE configuracion
  ADD COLUMN IF NOT EXISTS razon_social  TEXT,
  ADD COLUMN IF NOT EXISTS cuit          TEXT,
  ADD COLUMN IF NOT EXISTS direccion     TEXT,
  ADD COLUMN IF NOT EXISTS email_empresa TEXT,
  ADD COLUMN IF NOT EXISTS telefono      TEXT,
  ADD COLUMN IF NOT EXISTS servicios     JSONB NOT NULL DEFAULT '{}';

-- ============================================================
-- 8. RLS
-- ============================================================

ALTER TABLE locales        ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuario_locales ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_por_local ENABLE ROW LEVEL SECURITY;

-- Locales: todos leen, solo superadmin/admin escriben
CREATE POLICY "lectura" ON locales
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "escritura" ON locales
  FOR ALL USING (mi_rol() IN ('superadmin', 'admin'));

-- usuario_locales: todos leen, solo superadmin/admin escriben
CREATE POLICY "lectura" ON usuario_locales
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "escritura" ON usuario_locales
  FOR ALL USING (mi_rol() IN ('superadmin', 'admin'));

-- stock_por_local: todos leen, admin/vendedor escriben
CREATE POLICY "lectura" ON stock_por_local
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "escritura" ON stock_por_local
  FOR ALL USING (mi_rol() IN ('superadmin', 'admin', 'vendedor'));

-- configuracion: todos leen, superadmin/admin escriben
CREATE POLICY "lectura" ON configuracion
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "escritura" ON configuracion
  FOR ALL USING (mi_rol() IN ('superadmin', 'admin'));

-- ============================================================
-- 9. VISTA STOCK CONSOLIDADO (útil para el admin que ve todo)
-- ============================================================

CREATE VIEW vista_stock_por_local AS
SELECT
  p.id          AS producto_id,
  p.codigo,
  p.nombre,
  p.unidad,
  p.es_servicio,
  l.id          AS local_id,
  l.nombre      AS local_nombre,
  COALESCE(spl.stock, 0) AS stock
FROM productos p
CROSS JOIN locales l
LEFT JOIN stock_por_local spl
  ON spl.producto_id = p.id AND spl.local_id = l.id
WHERE p.activo = true AND l.activo = true AND p.es_servicio = false
ORDER BY p.nombre, l.nombre;
