-- ============================================================
-- FIX: Vistas de proveedores y cuenta corriente
--
-- Problemas resueltos:
--   1. vista_resumen_proveedores no existía → 404 en página Proveedores
--   2. vista_cuenta_corriente_proveedores sin alias total_comprado → error en ProveedorDetail
--   3. Dashboard filtraba vista_cuenta_corriente por local_id (columna inexistente) → 400
--
-- Decisión de diseño:
--   - vista_cuenta_corriente se mantiene GLOBAL (1 fila por cliente, saldo acumulado).
--     No se le agrega local_id para no romper ProveedorDetail/.single() ni otras queries.
--   - El Dashboard pasa a sumar saldo_pendiente directamente desde ventas (filtrable por local_id).
--   - vista_cuenta_corriente_proveedores también se mantiene global (1 fila por proveedor).
-- ============================================================

-- 1. Recrear vista_cuenta_corriente_proveedores con alias total_comprado
DROP VIEW IF EXISTS vista_cuenta_corriente_proveedores CASCADE;

CREATE VIEW vista_cuenta_corriente_proveedores AS
SELECT
  p.id,
  p.razon_social,
  p.nombre_fantasia,
  COALESCE(c.total_compras, 0) AS total_facturado,
  COALESCE(c.total_compras, 0) AS total_comprado,
  COALESCE(pg.total_pagado, 0) AS total_pagado,
  COALESCE(c.total_compras, 0) - COALESCE(pg.total_pagado, 0) AS saldo_deudor
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

-- 2. Crear vista_resumen_proveedores (faltaba — causaba 404)
CREATE OR REPLACE VIEW vista_resumen_proveedores AS
SELECT
  p.id,
  p.razon_social,
  p.nombre_fantasia,
  p.cuit,
  p.email,
  p.telefono,
  p.direccion,
  p.localidad,
  p.activo,
  p.notas,
  p.created_at,
  p.updated_at,
  COALESCE(vcc.total_facturado, 0) AS total_comprado,
  COALESCE(vcc.total_pagado, 0)    AS total_pagado,
  COALESCE(vcc.saldo_deudor, 0)    AS saldo_deudor
FROM proveedores p
LEFT JOIN vista_cuenta_corriente_proveedores vcc ON vcc.id = p.id;
