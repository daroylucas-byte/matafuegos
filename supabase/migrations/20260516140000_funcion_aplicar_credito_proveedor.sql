-- ============================================================
-- FUNCIÓN: aplicar_credito_proveedor
-- Busca pagos con saldo a favor del proveedor e impúta a la compra
-- ============================================================

CREATE OR REPLACE FUNCTION aplicar_credito_proveedor(p_compra_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_proveedor_id UUID;
    v_saldo_compra NUMERIC;
    v_pago RECORD;
    v_monto_a_imputar NUMERIC;
    v_total_aplicado NUMERIC := 0;
BEGIN
    -- 1. Obtener info de la compra
    SELECT proveedor_id, saldo_pendiente INTO v_proveedor_id, v_saldo_compra
    FROM compras
    WHERE id = p_compra_id;

    IF v_saldo_compra <= 0 THEN
        RETURN 0;
    END IF;

    -- 2. Buscar pagos con saldo disponible (monto > sum(imputaciones))
    FOR v_pago IN 
        SELECT 
            p.id, 
            p.monto - COALESCE(SUM(i.monto), 0) as saldo_disponible
        FROM pagos_proveedores p
        LEFT JOIN pago_proveedor_imputaciones i ON i.pago_id = p.id
        WHERE p.proveedor_id = v_proveedor_id
        GROUP BY p.id
        HAVING (p.monto - COALESCE(SUM(i.monto), 0)) > 0.01
        ORDER BY p.created_at ASC
    LOOP
        -- Calcular cuánto podemos imputar de este pago
        v_monto_a_imputar := LEAST(v_saldo_compra, v_pago.saldo_disponible);

        -- Crear la imputación
        INSERT INTO pago_proveedor_imputaciones (pago_id, compra_id, monto)
        VALUES (v_pago.id, p_compra_id, v_monto_a_imputar);

        -- Actualizar acumuladores
        v_saldo_compra := v_saldo_compra - v_monto_a_imputar;
        v_total_aplicado := v_total_aplicado + v_monto_a_imputar;

        -- Si ya pagamos la compra, terminamos
        IF v_saldo_compra <= 0 THEN
            EXIT;
        END IF;
    END LOOP;

    RETURN v_total_aplicado;
END;
$$;
