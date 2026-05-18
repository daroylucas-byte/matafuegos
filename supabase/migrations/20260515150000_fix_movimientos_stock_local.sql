-- ============================================================
-- FIX: Agregar local_id a movimientos_stock
-- Actualizar registrar_movimiento_stock para incluir local_id
-- Actualizar vista_kardex para incluir local y local_nombre
-- ============================================================

-- 1. Agregar columna local_id a movimientos_stock
ALTER TABLE movimientos_stock
  ADD COLUMN IF NOT EXISTS local_id UUID REFERENCES locales(id);

-- 2. Función actualizada con local_id
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
    (producto_id, tipo, cantidad, stock_resultante, referencia_id, descripcion, local_id)
  VALUES
    (p_producto_id, p_tipo, p_cantidad, v_stock_nuevo, p_referencia_id, p_descripcion, p_local_id);
END;
$$;

-- 3. Vista kardex actualizada con local
DROP VIEW IF EXISTS vista_kardex;

CREATE VIEW vista_kardex AS
SELECT
  ms.id,
  ms.producto_id,
  p.nombre        AS producto_nombre,
  p.codigo        AS producto_codigo,
  ms.tipo,
  ms.cantidad,
  ms.stock_resultante,
  ms.referencia_id,
  ms.local_id,
  l.nombre        AS local_nombre,
  ms.descripcion,
  ms.created_at
FROM movimientos_stock ms
JOIN productos p ON p.id = ms.producto_id
LEFT JOIN locales l ON l.id = ms.local_id
ORDER BY ms.created_at DESC;
