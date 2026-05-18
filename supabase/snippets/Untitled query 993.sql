-- ============================================================
-- EJECUTAR ESTE SCRIPT EN EL SQL EDITOR DEL STUDIO
-- http://127.0.0.1:54323
-- (superadmin ya está en el enum, no hace falta agregarlo)
-- ============================================================

-- 1. TABLA LOCALES
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

INSERT INTO locales (id, nombre) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Local Principal');

-- 2. USUARIO_LOCALES
CREATE TABLE usuario_locales (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  local_id   UUID NOT NULL REFERENCES locales(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (usuario_id, local_id)
);

-- 3. STOCK_POR_LOCAL
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

-- Migrar stock actual al Local Principal
INSERT INTO stock_por_local (producto_id, local_id, stock)
SELECT id, '00000000-0000-0000-0000-000000000001', stock
FROM productos
WHERE es_servicio = false;

-- 4. local_id EN TABLAS OPERATIVAS
ALTER TABLE ventas           ADD COLUMN local_id UUID NOT NULL REFERENCES locales(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE compras          ADD COLUMN local_id UUID NOT NULL REFERENCES locales(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE pagos            ADD COLUMN local_id UUID NOT NULL REFERENCES locales(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE pagos_proveedores ADD COLUMN local_id UUID NOT NULL REFERENCES locales(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE caja_sesiones    ADD COLUMN local_id UUID NOT NULL REFERENCES locales(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE movimientos_extra ADD COLUMN local_id UUID NOT NULL REFERENCES locales(id) DEFAULT '00000000-0000-0000-0000-000000000001';

-- 5. CAMPOS EXTRA EN CONFIGURACION
ALTER TABLE configuracion
  ADD COLUMN IF NOT EXISTS razon_social  TEXT,
  ADD COLUMN IF NOT EXISTS cuit          TEXT,
  ADD COLUMN IF NOT EXISTS direccion     TEXT,
  ADD COLUMN IF NOT EXISTS email_empresa TEXT,
  ADD COLUMN IF NOT EXISTS telefono      TEXT,
  ADD COLUMN IF NOT EXISTS servicios     JSONB NOT NULL DEFAULT '{}';

-- 6. RLS
ALTER TABLE locales         ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuario_locales ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_por_local ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lectura"   ON locales         FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "escritura" ON locales         FOR ALL    USING (mi_rol() IN ('superadmin', 'admin'));
CREATE POLICY "lectura"   ON usuario_locales FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "escritura" ON usuario_locales FOR ALL    USING (mi_rol() IN ('superadmin', 'admin'));
CREATE POLICY "lectura"   ON stock_por_local FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "escritura" ON stock_por_local FOR ALL    USING (mi_rol() IN ('superadmin', 'admin', 'vendedor'));

-- 7. VISTA STOCK CONSOLIDADO
CREATE VIEW vista_stock_por_local AS
SELECT
  p.id AS producto_id, p.codigo, p.nombre, p.unidad,
  l.id AS local_id, l.nombre AS local_nombre,
  COALESCE(spl.stock, 0) AS stock
FROM productos p
CROSS JOIN locales l
LEFT JOIN stock_por_local spl ON spl.producto_id = p.id AND spl.local_id = l.id
WHERE p.activo = true AND l.activo = true AND p.es_servicio = false
ORDER BY p.nombre, l.nombre;
