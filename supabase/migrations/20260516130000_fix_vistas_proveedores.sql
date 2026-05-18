-- RECREAR vista_cuenta_corriente_proveedores (GLOBAL, sin local_id)
DROP VIEW IF EXISTS vista_cuenta_corriente_proveedores CASCADE;

CREATE VIEW vista_cuenta_corriente_proveedores AS
SELECT
  p.id,
  p.razon_social,
  p.nombre_fantasia,
  COALESCE(c.total_compras, 0)                                 AS total_facturado,
  COALESCE(c.total_compras, 0)                                 AS total_comprado, -- Alias para el frontend (detalle)
  COALESCE(pg.total_pagado, 0)                                 AS total_pagado,
  COALESCE(c.total_compras, 0) - COALESCE(pg.total_pagado, 0) AS saldo_deudor,
  COALESCE(c.total_compras, 0) - COALESCE(pg.total_pagado, 0) AS deuda_total -- Alias para el frontend (lista)
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

-- CREAR vista_resumen_proveedores (Fuente para Proveedores.tsx)
CREATE OR REPLACE VIEW vista_resumen_proveedores AS
SELECT 
    p.*,
    vccp.total_comprado,
    vccp.total_pagado,
    vccp.saldo_deudor,
    vccp.deuda_total
FROM proveedores p
LEFT JOIN vista_cuenta_corriente_proveedores vccp ON vccp.id = p.id;
