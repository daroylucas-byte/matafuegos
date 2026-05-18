-- ============================================================
-- MÓDULO PROVEEDORES: Espejo de ventas/pagos para proveedores
-- Tablas: compras, compra_items, pagos_proveedores
-- Vista:  vista_cuenta_corriente_proveedores
-- ============================================================

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE compra_estado AS ENUM (
  'borrador', 'recibida', 'pagada', 'cancelada'
);

-- ============================================================
-- COMPRAS (espejo de ventas)
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS compras_numero_seq;

CREATE TABLE compras (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero          INTEGER NOT NULL DEFAULT nextval('compras_numero_seq') UNIQUE,
  proveedor_id    UUID NOT NULL REFERENCES proveedores(id),
  receptor_id     UUID REFERENCES profiles(id),
  estado          compra_estado NOT NULL DEFAULT 'borrador',
  fecha           DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_vencimiento DATE,
  numero_factura  TEXT,
  subtotal        NUMERIC(12,2) NOT NULL DEFAULT 0,
  total           NUMERIC(12,2) NOT NULL DEFAULT 0,
  saldo_pendiente NUMERIC(12,2) NOT NULL DEFAULT 0,
  notas           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- COMPRA ITEMS (espejo de venta_items)
-- ============================================================

CREATE TABLE compra_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  compra_id       UUID NOT NULL REFERENCES compras(id) ON DELETE CASCADE,
  producto_id     UUID REFERENCES productos(id),
  descripcion     TEXT NOT NULL,
  cantidad        NUMERIC(12,3) NOT NULL,
  precio_unitario NUMERIC(12,2) NOT NULL,
  subtotal        NUMERIC(12,2) NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- PAGOS PROVEEDORES (espejo de pagos)
-- ============================================================

CREATE TABLE pagos_proveedores (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proveedor_id   UUID NOT NULL REFERENCES proveedores(id),
  caja_sesion_id UUID REFERENCES caja_sesiones(id),
  metodo         pago_metodo NOT NULL DEFAULT 'efectivo',
  monto          NUMERIC(12,2) NOT NULL CHECK (monto > 0),
  fecha          DATE NOT NULL DEFAULT CURRENT_DATE,
  referencia     TEXT,
  notas          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- PAGO IMPUTACIONES PROVEEDORES (espejo de pago_imputaciones)
-- ============================================================

CREATE TABLE pago_proveedor_imputaciones (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pago_id    UUID NOT NULL REFERENCES pagos_proveedores(id) ON DELETE CASCADE,
  compra_id  UUID NOT NULL REFERENCES compras(id),
  monto      NUMERIC(12,2) NOT NULL CHECK (monto > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TRIGGER updated_at para compras
-- ============================================================

CREATE TRIGGER trg_compras_updated_at
  BEFORE UPDATE ON compras
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- TRIGGER recalcular saldo_pendiente en compras
-- (espejo de recalcular_saldo_venta)
-- ============================================================

CREATE OR REPLACE FUNCTION recalcular_saldo_compra()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
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

CREATE TRIGGER trg_pago_proveedor_imputacion_cambio
  AFTER INSERT OR UPDATE OR DELETE ON pago_proveedor_imputaciones
  FOR EACH ROW EXECUTE FUNCTION recalcular_saldo_compra();

-- ============================================================
-- VISTA cuenta corriente proveedores
-- (espejo de vista_cuenta_corriente)
-- ============================================================

CREATE VIEW vista_cuenta_corriente_proveedores AS
SELECT
  p.id,
  p.razon_social,
  p.nombre_fantasia,
  COALESCE(c.total_compras, 0)                                    AS total_facturado,
  COALESCE(pg.total_pagado, 0)                                    AS total_pagado,
  COALESCE(c.total_compras, 0) - COALESCE(pg.total_pagado, 0)    AS saldo_deudor
FROM proveedores p
LEFT JOIN (
  SELECT proveedor_id, SUM(total) AS total_compras
  FROM compras
  WHERE estado NOT IN ('borrador', 'cancelada')
  GROUP BY proveedor_id
) c ON c.proveedor_id = p.id
LEFT JOIN (
  SELECT proveedor_id, SUM(monto) AS total_pagado
  FROM pagos_proveedores
  GROUP BY proveedor_id
) pg ON pg.proveedor_id = p.id;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE compras                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE compra_items               ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos_proveedores          ENABLE ROW LEVEL SECURITY;
ALTER TABLE pago_proveedor_imputaciones ENABLE ROW LEVEL SECURITY;

-- Lectura: todos los usuarios autenticados
CREATE POLICY "lectura" ON compras                    FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "lectura" ON compra_items               FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "lectura" ON pagos_proveedores          FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "lectura" ON pago_proveedor_imputaciones FOR SELECT USING (auth.uid() IS NOT NULL);

-- Escritura: admin y vendedor pueden cargar compras (igual que ventas)
CREATE POLICY "escritura" ON compras      FOR ALL USING (mi_rol() IN ('admin', 'vendedor'));
CREATE POLICY "escritura" ON compra_items FOR ALL USING (mi_rol() IN ('admin', 'vendedor'));

-- Escritura: admin y cajero pueden registrar pagos a proveedores (igual que pagos)
CREATE POLICY "escritura" ON pagos_proveedores           FOR ALL USING (mi_rol() IN ('admin', 'cajero'));
CREATE POLICY "escritura" ON pago_proveedor_imputaciones FOR ALL USING (mi_rol() IN ('admin', 'cajero'));
