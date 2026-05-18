-- Trigger para poner saldo_pendiente en 0 cuando se cancela una venta
CREATE OR REPLACE FUNCTION trg_fix_saldo_cancelado()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.estado = 'cancelado' THEN
    NEW.saldo_pendiente := 0;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ventas_cancelado_saldo ON ventas;
CREATE TRIGGER trg_ventas_cancelado_saldo
  BEFORE UPDATE OF estado ON ventas
  FOR EACH ROW
  WHEN (NEW.estado = 'cancelado')
  EXECUTE FUNCTION trg_fix_saldo_cancelado();

-- Actualizar ventas ya canceladas que tengan saldo > 0
UPDATE ventas SET saldo_pendiente = 0 WHERE estado = 'cancelado' AND saldo_pendiente > 0;
