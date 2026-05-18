-- 0. Agregar columna de prioridad a pagos_proveedores
ALTER TABLE pagos_proveedores ADD COLUMN IF NOT EXISTS compra_prioritaria_id UUID REFERENCES compras(id);

-- 1. Función para imputar un pago específico a compras pendientes
CREATE OR REPLACE FUNCTION imputar_pago_proveedor_fifo(p_pago_id UUID)
RETURNS NUMERIC AS $$
DECLARE
    v_proveedor_id UUID;
    v_compra_prioritaria_id UUID;
    v_monto_disponible NUMERIC;
    v_compra RECORD;
    v_monto_a_imputar NUMERIC;
    v_total_imputado NUMERIC := 0;
BEGIN
    -- Obtener el monto disponible del pago y si hay compra prioritaria
    SELECT proveedor_id, compra_prioritaria_id, monto - (SELECT COALESCE(SUM(monto), 0) FROM pago_proveedor_imputaciones WHERE pago_id = p_pago_id)
    INTO v_proveedor_id, v_compra_prioritaria_id, v_monto_disponible
    FROM pagos_proveedores
    WHERE id = p_pago_id;

    IF v_monto_disponible <= 0 THEN RETURN 0; END IF;

    -- 1. Si hay una compra prioritaria, intentar imputar ahí primero
    IF v_compra_prioritaria_id IS NOT NULL THEN
        SELECT id, saldo_pendiente INTO v_compra
        FROM compras
        WHERE id = v_compra_prioritaria_id AND saldo_pendiente > 0 AND estado NOT IN ('borrador', 'cancelada');

        IF v_compra.id IS NOT NULL THEN
            v_monto_a_imputar := LEAST(v_monto_disponible, v_compra.saldo_pendiente);
            
            INSERT INTO pago_proveedor_imputaciones (pago_id, compra_id, monto)
            VALUES (p_pago_id, v_compra.id, v_monto_a_imputar);
            
            v_monto_disponible := v_monto_disponible - v_monto_a_imputar;
            v_total_imputado := v_total_imputado + v_monto_a_imputar;
        END IF;
    END IF;

    IF v_monto_disponible <= 0 THEN RETURN v_total_imputado; END IF;

    -- 2. Buscar resto de compras pendientes (FIFO)
    FOR v_compra IN 
        SELECT id, saldo_pendiente 
        FROM compras 
        WHERE proveedor_id = v_proveedor_id 
          AND id != COALESCE(v_compra_prioritaria_id, '00000000-0000-0000-0000-000000000000'::UUID)
          AND saldo_pendiente > 0 
          AND estado NOT IN ('borrador', 'cancelada')
        ORDER BY fecha ASC, created_at ASC
    LOOP
        v_monto_a_imputar := LEAST(v_monto_disponible, v_compra.saldo_pendiente);
        
        IF v_monto_a_imputar > 0 THEN
            INSERT INTO pago_proveedor_imputaciones (pago_id, compra_id, monto)
            VALUES (p_pago_id, v_compra.id, v_monto_a_imputar);
            
            v_monto_disponible := v_monto_disponible - v_monto_a_imputar;
            v_total_imputado := v_total_imputado + v_monto_a_imputar;
        END IF;

        IF v_monto_disponible <= 0 THEN EXIT; END IF;
    END LOOP;

    RETURN v_total_imputado;
END;
$$ LANGUAGE plpgsql;

-- 2. Función para imputar crédito disponible a una compra específica
-- (Ya la creamos como aplicar_credito_proveedor, la actualizamos para ser consistente)
CREATE OR REPLACE FUNCTION aplicar_credito_proveedor(p_compra_id UUID)
RETURNS NUMERIC AS $$
DECLARE
    v_proveedor_id UUID;
    v_saldo_compra NUMERIC;
    v_pago RECORD;
    v_monto_a_imputar NUMERIC;
    v_total_aplicado NUMERIC := 0;
BEGIN
    SELECT proveedor_id, saldo_pendiente INTO v_proveedor_id, v_saldo_compra
    FROM compras
    WHERE id = p_compra_id AND estado NOT IN ('borrador', 'cancelada');

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
        
        INSERT INTO pago_proveedor_imputaciones (pago_id, compra_id, monto)
        VALUES (v_pago.id, p_compra_id, v_monto_a_imputar);

        v_saldo_compra := v_saldo_compra - v_monto_a_imputar;
        v_total_aplicado := v_total_aplicado + v_monto_a_imputar;

        IF v_saldo_compra <= 0 THEN EXIT; END IF;
    END LOOP;

    RETURN v_total_aplicado;
END;
$$ LANGUAGE plpgsql;

-- 3. Triggers para automatizar el proceso

-- A. Al recibir un nuevo pago
CREATE OR REPLACE FUNCTION trg_auto_imputar_pago()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM imputar_pago_proveedor_fifo(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pago_proveedor_auto_imputar ON pagos_proveedores;
CREATE TRIGGER trg_pago_proveedor_auto_imputar
    AFTER INSERT ON pagos_proveedores
    FOR EACH ROW EXECUTE FUNCTION trg_auto_imputar_pago();

-- B. Al crear o recibir una compra
CREATE OR REPLACE FUNCTION trg_auto_imputar_compra()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo si la compra está activa y tiene saldo
    IF NEW.estado NOT IN ('borrador', 'cancelada') AND NEW.saldo_pendiente > 0 THEN
        PERFORM aplicar_credito_proveedor(NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_compra_auto_imputar ON compras;
CREATE TRIGGER trg_compra_auto_imputar
    AFTER INSERT OR UPDATE OF estado ON compras
    FOR EACH ROW EXECUTE FUNCTION trg_auto_imputar_compra();
