-- ============================================================
-- DASHBOARD: vistas y columna para widgets con filtro por local y fecha
-- ============================================================

-- 1. Stock mínimo configurable por producto
ALTER TABLE productos ADD COLUMN IF NOT EXISTS stock_minimo NUMERIC(12,3) NOT NULL DEFAULT 0;

-- 2. Productos más vendidos (filtrable por local_id y fecha en el frontend)
CREATE OR REPLACE VIEW vista_productos_mas_vendidos AS
SELECT
  vi.producto_id,
  p.nombre         AS producto_nombre,
  p.codigo         AS producto_codigo,
  p.unidad,
  v.local_id,
  l.nombre         AS local_nombre,
  v.fecha,
  SUM(vi.cantidad) AS cantidad_total,
  SUM(vi.subtotal) AS monto_total
FROM venta_items vi
JOIN ventas v    ON v.id  = vi.venta_id
JOIN productos p ON p.id  = vi.producto_id
JOIN locales l   ON l.id  = v.local_id
WHERE v.estado NOT IN ('presupuesto', 'cancelado')
  AND vi.producto_id IS NOT NULL
GROUP BY vi.producto_id, p.nombre, p.codigo, p.unidad, v.local_id, l.nombre, v.fecha;

-- 3. Deuda de clientes por local (filtrable por local_id en el frontend)
CREATE OR REPLACE VIEW vista_deuda_clientes_por_local AS
SELECT
  c.id            AS cliente_id,
  c.razon_social,
  c.nombre_fantasia,
  c.limite_credito,
  v.local_id,
  l.nombre        AS local_nombre,
  COALESCE(SUM(v.total), 0)            AS total_facturado,
  COALESCE(SUM(v.saldo_pendiente), 0)  AS saldo_deudor
FROM clientes c
JOIN ventas v  ON v.cliente_id = c.id
JOIN locales l ON l.id = v.local_id
WHERE v.estado NOT IN ('presupuesto', 'cancelado')
GROUP BY c.id, c.razon_social, c.nombre_fantasia, c.limite_credito, v.local_id, l.nombre;
