-- ============================================================
-- SISTEMA DE STOCK: Kardex + Triggers automáticos
--
-- Reglas:
--   VENTAS  → stock baja cuando venta pasa a 'confirmado'
--             stock vuelve si pasa a 'cancelado' desde >= confirmado
--   COMPRAS → stock sube al insertar compra_item (inmediato)
--             stock baja si se elimina el compra_item o se cancela la compra
-- ============================================================

-- ============================================================
-- TABLA KARDEX
-- ============================================================

CREATE TYPE movimiento_stock_tipo AS ENUM ('venta', 'compra', 'ajuste');

CREATE TABLE movimientos_stock (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id       UUID NOT NULL REFERENCES productos(id),
  tipo              movimiento_stock_tipo NOT NULL,
  cantidad          NUMERIC(12,3) NOT NULL,  -- positivo = entrada, negativo = salida
  stock_resultante  NUMERIC(12,3) NOT NULL,  -- snapshot del stock después del movimiento
  referencia_id     UUID,                    -- venta_id o compra_id
  descripcion       TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- FUNCIÓN AUXILIAR: registrar movimiento y actualizar stock
-- ============================================================

CREATE OR REPLACE FUNCTION registrar_movimiento_stock(
  p_producto_id    UUID,
  p_cantidad       NUMERIC,   -- positivo = entrada, negativo = salida
  p_tipo           movimiento_stock_tipo,
  p_referencia_id  UUID,
  p_descripcion    TEXT
) RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  v_stock_nuevo NUMERIC;
BEGIN
  UPDATE productos
    SET stock = stock + p_cantidad
  WHERE id = p_producto_id AND es_servicio = false
  RETURNING stock INTO v_stock_nuevo;

  -- Si es servicio, no existe fila actualizada; salir sin registrar
  IF NOT FOUND THEN RETURN; END IF;

  INSERT INTO movimientos_stock
    (producto_id, tipo, cantidad, stock_resultante, referencia_id, descripcion)
  VALUES
    (p_producto_id, p_tipo, p_cantidad, v_stock_nuevo, p_referencia_id, p_descripcion);
END;
$$;

-- ============================================================
-- TRIGGER: VENTAS — disparar al cambiar estado
--
-- Descuenta stock cuando:  OLD.estado != 'confirmado' y NEW.estado = 'confirmado'
-- Devuelve stock cuando:   OLD.estado IN estados_post_confirmado y NEW.estado = 'cancelado'
-- ============================================================

CREATE OR REPLACE FUNCTION trg_ventas_stock()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  estados_activos venta_estado[] := ARRAY[
    'confirmado', 'en_preparacion', 'entregado', 'facturado', 'cobrado'
  ]::venta_estado[];
  item RECORD;
BEGIN
  -- Confirmar venta: descontar stock de cada ítem
  IF NEW.estado = 'confirmado' AND OLD.estado = 'presupuesto' THEN
    FOR item IN
      SELECT vi.producto_id, vi.cantidad, vi.descripcion
      FROM venta_items vi
      WHERE vi.venta_id = NEW.id AND vi.producto_id IS NOT NULL
    LOOP
      PERFORM registrar_movimiento_stock(
        item.producto_id,
        -item.cantidad,
        'venta',
        NEW.id,
        'Venta V-' || LPAD(NEW.numero::text, 7, '0') || ' — ' || item.descripcion
      );
    END LOOP;

  -- Cancelar venta que estaba activa (>= confirmado): devolver stock
  ELSIF NEW.estado = 'cancelado' AND OLD.estado = ANY(estados_activos) THEN
    FOR item IN
      SELECT vi.producto_id, vi.cantidad, vi.descripcion
      FROM venta_items vi
      WHERE vi.venta_id = NEW.id AND vi.producto_id IS NOT NULL
    LOOP
      PERFORM registrar_movimiento_stock(
        item.producto_id,
        item.cantidad,
        'ajuste',
        NEW.id,
        'Cancelación V-' || LPAD(NEW.numero::text, 7, '0') || ' — ' || item.descripcion
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ventas_estado_stock
  AFTER UPDATE OF estado ON ventas
  FOR EACH ROW EXECUTE FUNCTION trg_ventas_stock();

-- ============================================================
-- TRIGGER: COMPRAS — disparar al insertar/eliminar compra_items
--
-- Sube stock al INSERT de un compra_item (si la compra no está cancelada)
-- Baja stock al DELETE de un compra_item (si la compra no estaba cancelada)
-- ============================================================

CREATE OR REPLACE FUNCTION trg_compra_items_stock()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_compra RECORD;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT numero, estado INTO v_compra FROM compras WHERE id = NEW.compra_id;
    IF v_compra.estado != 'cancelada' AND NEW.producto_id IS NOT NULL THEN
      PERFORM registrar_movimiento_stock(
        NEW.producto_id,
        NEW.cantidad,
        'compra',
        NEW.compra_id,
        'Compra C-' || LPAD(v_compra.numero::text, 7, '0') || ' — ' || NEW.descripcion
      );
    END IF;

  ELSIF TG_OP = 'DELETE' THEN
    SELECT numero, estado INTO v_compra FROM compras WHERE id = OLD.compra_id;
    IF v_compra.estado != 'cancelada' AND OLD.producto_id IS NOT NULL THEN
      PERFORM registrar_movimiento_stock(
        OLD.producto_id,
        -OLD.cantidad,
        'ajuste',
        OLD.compra_id,
        'Eliminación ítem C-' || LPAD(v_compra.numero::text, 7, '0') || ' — ' || OLD.descripcion
      );
    END IF;
  END IF;

  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_compra_items_stock
  AFTER INSERT OR DELETE ON compra_items
  FOR EACH ROW EXECUTE FUNCTION trg_compra_items_stock();

-- ============================================================
-- TRIGGER: COMPRAS — cancelar compra devuelve stock de sus ítems
-- ============================================================

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
        item.producto_id,
        -item.cantidad,
        'ajuste',
        NEW.id,
        'Cancelación C-' || LPAD(NEW.numero::text, 7, '0') || ' — ' || item.descripcion
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_compras_cancelacion_stock
  AFTER UPDATE OF estado ON compras
  FOR EACH ROW EXECUTE FUNCTION trg_compras_cancelacion_stock();

-- ============================================================
-- RLS para movimientos_stock
-- ============================================================

ALTER TABLE movimientos_stock ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lectura" ON movimientos_stock
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Solo admin puede insertar ajustes manuales; los triggers usan SECURITY DEFINER implícito
CREATE POLICY "escritura" ON movimientos_stock
  FOR ALL USING (mi_rol() = 'admin');

-- ============================================================
-- VISTA: kardex por producto (útil para ProductoDetail)
-- ============================================================

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
  ms.descripcion,
  ms.created_at
FROM movimientos_stock ms
JOIN productos p ON p.id = ms.producto_id
ORDER BY ms.created_at DESC;
