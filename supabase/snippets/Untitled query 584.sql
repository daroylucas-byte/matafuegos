-- ============================================================
-- SEED COMPLEMENTARIO: tablas nuevas post-migración
-- Ejecutar en el SQL Editor del Studio: http://127.0.0.1:54323
-- ============================================================

-- ============================================================
-- 1. USUARIO_LOCALES
-- Asignar todos los usuarios al Local Principal
-- ============================================================

INSERT INTO usuario_locales (usuario_id, local_id)
SELECT p.id, '00000000-0000-0000-0000-000000000001'
FROM profiles p
ON CONFLICT (usuario_id, local_id) DO NOTHING;

-- ============================================================
-- 2. COMPRAS (facturas de proveedores de ejemplo)
-- ============================================================

INSERT INTO compras (id, numero, proveedor_id, receptor_id, estado, fecha, fecha_vencimiento, numero_factura, subtotal, total, saldo_pendiente, local_id) VALUES
  (
    '70000000-0000-0000-0000-000000000001', 2001,
    '20000000-0000-0000-0000-000000000001',  -- Siderurgia Nacional
    '00000000-0000-0000-0000-000000000001',  -- admin
    'pagada', CURRENT_DATE - 30, CURRENT_DATE - 15,
    'FA-0001-00012345', 185000, 185000, 0,
    '00000000-0000-0000-0000-000000000001'
  ),
  (
    '70000000-0000-0000-0000-000000000002', 2002,
    '20000000-0000-0000-0000-000000000002',  -- Plásticos del Sur
    '00000000-0000-0000-0000-000000000001',
    'recibida', CURRENT_DATE - 10, CURRENT_DATE + 20,
    'FB-0002-00005678', 63200, 63200, 63200,
    '00000000-0000-0000-0000-000000000001'
  ),
  (
    '70000000-0000-0000-0000-000000000003', 2003,
    '20000000-0000-0000-0000-000000000004',  -- TechParts
    '00000000-0000-0000-0000-000000000001',
    'borrador', CURRENT_DATE - 2, NULL,
    NULL, 210000, 210000, 210000,
    '00000000-0000-0000-0000-000000000001'
  ),
  (
    '70000000-0000-0000-0000-000000000004', 2004,
    '20000000-0000-0000-0000-000000000001',  -- Siderurgia Nacional
    '00000000-0000-0000-0000-000000000001',
    'recibida', CURRENT_DATE - 5, CURRENT_DATE + 25,
    'FA-0001-00012399', 520000, 520000, 520000,
    '00000000-0000-0000-0000-000000000001'
  )
ON CONFLICT (id) DO NOTHING;

-- Items de compras
INSERT INTO compra_items (compra_id, producto_id, descripcion, cantidad, precio_unitario, subtotal) VALUES
  ('70000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000004', 'Silla Gamer Pro',        1, 185000, 185000),
  ('70000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000006', 'Cable HDMI 2.1 2m',     20,   2100,  42000),
  ('70000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000007', 'Hub USB-C 7 en 1',       1,  21000,  21200),
  ('70000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001', 'Monitor Pro 27" 4K',     2, 105000, 210000),
  ('70000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000001', 'Monitor Pro 27" 4K',     1, 520000, 520000)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 3. PAGOS PROVEEDORES
-- ============================================================

INSERT INTO pagos_proveedores (id, proveedor_id, metodo, monto, fecha, referencia, notas, local_id) VALUES
  (
    '80000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',  -- Siderurgia Nacional
    'transferencia', 185000, CURRENT_DATE - 14,
    'TRF-PROV-001', 'Pago total compra 2001',
    '00000000-0000-0000-0000-000000000001'
  )
ON CONFLICT (id) DO NOTHING;

-- Imputar pago a compra
INSERT INTO pago_proveedor_imputaciones (pago_id, compra_id, monto) VALUES
  ('80000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 185000)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 4. CONFIGURACION inicial (si no existe)
-- ============================================================

INSERT INTO configuracion (id, nombre_app, color_primario, color_secundario, razon_social, cuit, direccion, email_empresa, telefono)
VALUES (
  1,
  'Matafuegos App',
  '#3525cd',
  '#006c49',
  'Mi Empresa S.A.',
  '30-12345678-9',
  'Av. Corrientes 1234, CABA',
  'info@miempresa.com',
  '+54 11 1234-5678'
)
ON CONFLICT (id) DO UPDATE SET
  nombre_app    = EXCLUDED.nombre_app,
  razon_social  = EXCLUDED.razon_social,
  cuit          = EXCLUDED.cuit,
  direccion     = EXCLUDED.direccion,
  email_empresa = EXCLUDED.email_empresa,
  telefono      = EXCLUDED.telefono;

-- ============================================================
-- 5. SEGUNDO LOCAL de ejemplo (para probar multi-local)
-- ============================================================

INSERT INTO locales (id, nombre, direccion, telefono, activo) VALUES
  ('00000000-0000-0000-0000-000000000002', 'Sucursal Norte', 'Av. Cabildo 2500, CABA', '+54 11 9988-7766', true)
ON CONFLICT (id) DO NOTHING;

-- Stock inicial en Sucursal Norte para algunos productos
INSERT INTO stock_por_local (producto_id, local_id, stock) VALUES
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 10),
  ('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 15),
  ('30000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000002', 50)
ON CONFLICT (producto_id, local_id) DO NOTHING;
