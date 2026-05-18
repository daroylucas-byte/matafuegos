-- ============================================================
-- FIX: Triggers de stock ahora pasan local_id correctamente
-- Los triggers anteriores llamaban la versión sin local_id
-- de registrar_movimiento_stock, por lo que el stock no se
-- actualizaba por sucursal. Se corrigen los 3 triggers y
-- se elimina la función vieja (5 params).
-- ============================================================

-- 1. Eliminar función vieja (5 params, sin local_id)
DROP FUNCTION IF EXISTS registrar_movimiento_stock(UUID, NUMERIC, movimiento_stock_tipo, UUID, TEXT);

-- 2. Trigger ventas: pasa NEW.local_id
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

-- 3. Trigger compra_items: toma local_id de la compra padre
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

-- 4. Trigger cancelación compra
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
