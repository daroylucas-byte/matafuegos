-- ============================================================
-- SEED DE DESARROLLO LOCAL
-- Usuario admin: admin@gestapp.com / admin123456
-- ============================================================

-- ============================================================
-- AUTH USERS
-- ============================================================

-- password: admin123456 (bcrypt hash)
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, created_at, updated_at, role, aud
) VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'admin@gestapp.com',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    now(), '{"nombre": "Administrador"}', now(), now(), 'authenticated', 'authenticated'
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'vendedor@gestapp.com',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    now(), '{"nombre": "Carlos Vendedor"}', now(), now(), 'authenticated', 'authenticated'
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'cajero@gestapp.com',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    now(), '{"nombre": "María Cajera"}', now(), now(), 'authenticated', 'authenticated'
  )
ON CONFLICT (id) DO NOTHING;

-- El trigger on_auth_user_created inserta los profiles automáticamente.
-- Actualizamos roles:
UPDATE profiles SET rol = 'admin'   WHERE email = 'admin@gestapp.com';
UPDATE profiles SET rol = 'vendedor' WHERE email = 'vendedor@gestapp.com';
UPDATE profiles SET rol = 'cajero'  WHERE email = 'cajero@gestapp.com';

-- ============================================================
-- CLIENTES
-- ============================================================

INSERT INTO clientes (id, razon_social, nombre_fantasia, cuit, email, telefono, direccion, localidad, limite_credito, activo, notas) VALUES
  ('10000000-0000-0000-0000-000000000001', 'Distribuidora Alvear S.A.',       'Alvear',         '30-71458922-4', 'admin@alvearsa.com.ar',       '+54 11 4588-2300', 'Av. de Mayo 1420',       'CABA, Argentina',          500000,  true,  'Cliente VIP. Entrega preferencial los martes por la mañana.'),
  ('10000000-0000-0000-0000-000000000002', 'Construcciones Modernas SRL',      'ConsMod',        '30-65432198-7', 'compras@consmod.com.ar',      '+54 351 455-1200', 'Bv. San Juan 540',       'Córdoba, Argentina',       300000,  true,  'Solicita remito en duplicado siempre.'),
  ('10000000-0000-0000-0000-000000000003', 'Supermercado Horizonte',           'Horizonte',      '20-18765432-1', 'abm@horizonte.com.ar',        '+54 223 488-4400', 'Av. Colón 2345',         'Mar del Plata, Argentina', 150000,  true,  NULL),
  ('10000000-0000-0000-0000-000000000004', 'Juan Pérez Indumentaria',          NULL,             '20-25643871-9', 'jperez@indumentaria.com',     '+54 11 3345-6677', 'Rivadavia 880',          'CABA, Argentina',          80000,   true,  NULL),
  ('10000000-0000-0000-0000-000000000005', 'Logística Express SRL',            'LogEx',          '33-78901234-5', 'operaciones@logex.com.ar',    '+54 11 5500-9988', 'Autopista Panamericana 2', 'Pilar, Argentina',         1000000, true,  'Cliente corporativo. Pago a 30 días.'),
  ('10000000-0000-0000-0000-000000000006', 'Taller Metalúrgico Don Luis',      NULL,             '20-30987654-3', 'donluis@metalurgica.com',     '+54 341 499-2211', 'Ruta 9 km 14',           'Rosario, Argentina',       50000,   true,  NULL),
  ('10000000-0000-0000-0000-000000000007', 'Ferretería El Tornillo',           'El Tornillo',    '30-44556677-8', 'ventas@eltornillo.com.ar',    '+54 11 4201-3344', 'Av. Directorio 1560',    'CABA, Argentina',          200000,  true,  NULL),
  ('10000000-0000-0000-0000-000000000008', 'Imprenta Grafisur S.A.',           'Grafisur',       '30-55667788-2', 'pedidos@grafisur.com.ar',     '+54 11 4302-8800', 'México 1234',            'CABA, Argentina',          120000,  true,  'Requiere orden de compra previa.'),
  ('10000000-0000-0000-0000-000000000009', 'Clinica del Hogar SA',             NULL,             '30-66778899-0', 'compras@clinicahogar.com',    '+54 261 420-5500', 'San Martín 340',         'Mendoza, Argentina',       250000,  true,  NULL),
  ('10000000-0000-0000-0000-000000000010', 'Empresa Inactiva Ejemplo',         NULL,             '30-99887766-1', 'contacto@inactiva.com',       '+54 11 0000-0000', 'Calle Falsa 123',        'CABA, Argentina',          0,       false, 'Cliente dado de baja en 2024.')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- PROVEEDORES
-- ============================================================

INSERT INTO proveedores (id, razon_social, nombre_fantasia, cuit, email, telefono, direccion, localidad, activo, notas) VALUES
  ('20000000-0000-0000-0000-000000000001', 'Siderurgia Nacional S.A.',  'SiderNac',   '30-50448833-2', 'ventas@siderurgia.com.ar',     '+54 11 4300-1100', 'Av. Constituyentes 5800', 'CABA, Argentina',    true,  'Proveedor principal de acero. Pago a 30 días.'),
  ('20000000-0000-0000-0000-000000000002', 'Plásticos del Sur SRL',     'PlasSur',    '30-71223344-5', 'info@plasticsur.com',          '+54 223 488-9900', 'Av. Independencia 780',   'Mar del Plata, Arg', true,  NULL),
  ('20000000-0000-0000-0000-000000000003', 'Herramientas Pro S.A.',     'HerraPro',   '33-66778899-1', 'comercial@herrapro.com',       '+54 351 455-6677', 'Av. Colón 1200',          'Córdoba, Argentina', false, 'Proveedor suspendido por problemas de calidad.'),
  ('20000000-0000-0000-0000-000000000004', 'Importadora TechParts',     'TechParts',  '30-81234567-9', 'compras@techparts.com.ar',     '+54 11 5298-4400', 'Av. Córdoba 3456',        'CABA, Argentina',    true,  'Componentes electrónicos importados. Stock limitado.'),
  ('20000000-0000-0000-0000-000000000005', 'Embalajes del Norte SRL',   'EmbaNorte',  '30-91234567-3', 'pedidos@embalanorte.com.ar',   '+54 381 422-6600', 'Av. Sarmiento 1122',      'Tucumán, Argentina', true,  NULL)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- PRODUCTOS
-- ============================================================

INSERT INTO productos (id, codigo, nombre, descripcion, precio, costo, stock, unidad, es_servicio, activo) VALUES
  ('30000000-0000-0000-0000-000000000001', 'P001-A',    'Monitor Pro 27" 4K',          'Monitor ultra HD para diseño profesional con calibración de color',  845500,  520000, 45,  'u.',    false, true),
  ('30000000-0000-0000-0000-000000000002', 'P042-B',    'Teclado Mecánico RGB',        'Switch blue, layout español, retroiluminación RGB',                   85200,   42100,  3,   'u.',    false, true),
  ('30000000-0000-0000-0000-000000000003', 'P015-C',    'Mouse Inalámbrico Ergonómico','Sensor 4000 DPI, batería recargable, receptor USB-C',                  48900,   24500,  28,  'u.',    false, true),
  ('30000000-0000-0000-0000-000000000004', 'P088-D',    'Silla Gamer Pro',             'Soporte lumbar, apoyabrazos 4D, base metálica',                       320000,  185000, 12,  'u.',    false, true),
  ('30000000-0000-0000-0000-000000000005', 'P099-E',    'Auriculares Bluetooth ANC',   'Cancelación activa de ruido, 30hs batería, plegable',                 125000,   68000,  0,   'u.',    false, true),
  ('30000000-0000-0000-0000-000000000006', 'P200-F',    'Cable HDMI 2.1 2m',           '8K 60Hz, 4K 120Hz, trenzado',                                          8900,    3200,  150, 'u.',    false, true),
  ('30000000-0000-0000-0000-000000000007', 'P201-G',    'Hub USB-C 7 en 1',            'HDMI 4K, 3x USB-A, SD, microSD, PD 100W',                             42500,   21000,  22,  'u.',    false, true),
  ('30000000-0000-0000-0000-000000000008', 'S-MANT-01', 'Mantenimiento Preventivo',    'Servicio técnico mensual para empresas. Incluye limpieza y diagnóstico', 250000, 0,    0,   'serv.', true,  true),
  ('30000000-0000-0000-0000-000000000009', 'S-INST-01', 'Instalación y Configuración', 'Instalación de equipos, red y software. Por jornada.',                  85000,  0,    0,   'serv.', true,  true),
  ('30000000-0000-0000-0000-000000000010', 'P-OLD-99',  'Mouse Cableado Legacy',       'Modelo descontinuado año 2022',                                         12000,  8500,  0,   'u.',    false, false)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- CAJA SESION (una abierta hoy)
-- ============================================================

INSERT INTO caja_sesiones (id, cajero_id, apertura_at, monto_apertura, estado) VALUES
  (
    '40000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000003',
    now() - interval '4 hours',
    25000,
    'abierta'
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- VENTAS
-- ============================================================

-- Venta 1: Cobrada - Distribuidora Alvear
INSERT INTO ventas (id, numero, cliente_id, vendedor_id, estado, fecha, subtotal, descuento, total, saldo_pendiente, notas)
VALUES (
  '50000000-0000-0000-0000-000000000001', 1001,
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  'cobrado', CURRENT_DATE - 20, 450000, 0, 450000, 0,
  'Entrega en depósito central.'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO venta_items (venta_id, producto_id, descripcion, cantidad, precio_unitario, descuento, subtotal) VALUES
  ('50000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000004', 'Silla Gamer Pro',    1, 320000, 0, 320000),
  ('50000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Monitor Pro 27" 4K', 1, 845500, 0, 845500)
ON CONFLICT DO NOTHING;

-- Venta 2: Facturada con saldo - Construcciones Modernas
INSERT INTO ventas (id, numero, cliente_id, vendedor_id, estado, fecha, subtotal, descuento, total, saldo_pendiente, notas)
VALUES (
  '50000000-0000-0000-0000-000000000002', 1002,
  '10000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000002',
  'facturado', CURRENT_DATE - 15, 842300, 0, 842300, 842300,
  NULL
) ON CONFLICT (id) DO NOTHING;

INSERT INTO venta_items (venta_id, producto_id, descripcion, cantidad, precio_unitario, descuento, subtotal) VALUES
  ('50000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000008', 'Mantenimiento Preventivo', 2, 250000, 0, 500000),
  ('50000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000009', 'Instalación y Configuración', 4, 85000, 0, 340000),
  ('50000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000006', 'Cable HDMI 2.1 2m', 10, 8900, 0, 89000)
ON CONFLICT DO NOTHING;

-- Venta 3: En preparación - Supermercado Horizonte
INSERT INTO ventas (id, numero, cliente_id, vendedor_id, estado, fecha, subtotal, descuento, total, saldo_pendiente)
VALUES (
  '50000000-0000-0000-0000-000000000003', 1003,
  '10000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000002',
  'en_preparacion', CURRENT_DATE - 5, 131050, 5820, 125230, 125230
) ON CONFLICT (id) DO NOTHING;

INSERT INTO venta_items (venta_id, producto_id, descripcion, cantidad, precio_unitario, descuento, subtotal) VALUES
  ('50000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000002', 'Teclado Mecánico RGB',    1, 85200, 0,    85200),
  ('50000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000003', 'Mouse Inalámbrico Ergo.', 1, 48900, 0,    48900),
  ('50000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000006', 'Cable HDMI 2.1 2m',       1, 8900,  2750,  6150)
ON CONFLICT DO NOTHING;

-- Venta 4: Confirmada - Juan Pérez Indumentaria
INSERT INTO ventas (id, numero, cliente_id, vendedor_id, estado, fecha, subtotal, descuento, total, saldo_pendiente)
VALUES (
  '50000000-0000-0000-0000-000000000004', 1004,
  '10000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000002',
  'confirmado', CURRENT_DATE - 3, 48900, 0, 48900, 48900
) ON CONFLICT (id) DO NOTHING;

INSERT INTO venta_items (venta_id, producto_id, descripcion, cantidad, precio_unitario, descuento, subtotal) VALUES
  ('50000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000003', 'Mouse Inalámbrico Ergonómico', 1, 48900, 0, 48900)
ON CONFLICT DO NOTHING;

-- Venta 5: Presupuesto grande - Logística Express
INSERT INTO ventas (id, numero, cliente_id, vendedor_id, estado, fecha, subtotal, descuento, total, saldo_pendiente, notas)
VALUES (
  '50000000-0000-0000-0000-000000000005', 1005,
  '10000000-0000-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000002',
  'presupuesto', CURRENT_DATE - 1, 2200000, 100000, 2100000, 2100000,
  'Presupuesto para equipamiento de 5 oficinas nuevas. Pendiente aprobación gerencia.'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO venta_items (venta_id, producto_id, descripcion, cantidad, precio_unitario, descuento, subtotal) VALUES
  ('50000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000001', 'Monitor Pro 27" 4K',     5, 845500, 0, 4227500),
  ('50000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000004', 'Silla Gamer Pro',        5, 320000, 0, 1600000),
  ('50000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000002', 'Teclado Mecánico RGB',   5,  85200, 0,  426000),
  ('50000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000003', 'Mouse Inalámbrico Ergo.',5,  48900, 0,  244500)
ON CONFLICT DO NOTHING;

-- Venta 6: Cancelada - Taller Don Luis
INSERT INTO ventas (id, numero, cliente_id, vendedor_id, estado, fecha, subtotal, descuento, total, saldo_pendiente)
VALUES (
  '50000000-0000-0000-0000-000000000006', 1006,
  '10000000-0000-0000-0000-000000000006',
  '00000000-0000-0000-0000-000000000002',
  'cancelado', CURRENT_DATE - 30, 312000, 0, 312000, 0
) ON CONFLICT (id) DO NOTHING;

INSERT INTO venta_items (venta_id, producto_id, descripcion, cantidad, precio_unitario, descuento, subtotal) VALUES
  ('50000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000004', 'Silla Gamer Pro', 1, 320000, 8000, 312000)
ON CONFLICT DO NOTHING;

-- Venta 7: Entregada - Ferretería El Tornillo
INSERT INTO ventas (id, numero, cliente_id, vendedor_id, estado, fecha, subtotal, descuento, total, saldo_pendiente)
VALUES (
  '50000000-0000-0000-0000-000000000007', 1007,
  '10000000-0000-0000-0000-000000000007',
  '00000000-0000-0000-0000-000000000002',
  'entregado', CURRENT_DATE - 8, 85000, 0, 85000, 85000
) ON CONFLICT (id) DO NOTHING;

INSERT INTO venta_items (venta_id, producto_id, descripcion, cantidad, precio_unitario, descuento, subtotal) VALUES
  ('50000000-0000-0000-0000-000000000007', '30000000-0000-0000-0000-000000000008', 'Mantenimiento Preventivo', 1, 85000, 0, 85000)
ON CONFLICT DO NOTHING;

-- Venta 8: Cobrada este mes - Imprenta Grafisur
INSERT INTO ventas (id, numero, cliente_id, vendedor_id, estado, fecha, subtotal, descuento, total, saldo_pendiente)
VALUES (
  '50000000-0000-0000-0000-000000000008', 1008,
  '10000000-0000-0000-0000-000000000008',
  '00000000-0000-0000-0000-000000000002',
  'cobrado', CURRENT_DATE - 10, 170400, 0, 170400, 0
) ON CONFLICT (id) DO NOTHING;

INSERT INTO venta_items (venta_id, producto_id, descripcion, cantidad, precio_unitario, descuento, subtotal) VALUES
  ('50000000-0000-0000-0000-000000000008', '30000000-0000-0000-0000-000000000009', 'Instalación y Configuración', 2, 85000, 0, 170000),
  ('50000000-0000-0000-0000-000000000008', '30000000-0000-0000-0000-000000000006', 'Cable HDMI 2.1 2m',           1,   400, 0,    400)
ON CONFLICT DO NOTHING;

-- ============================================================
-- PAGOS (para ventas cobradas + imputaciones manuales)
-- ============================================================

-- Pago de Alvear (cubre venta 1001: $450.000)
-- Nota: el trigger FIFO imputará automáticamente, pero en seed lo hacemos manualmente
-- porque el trigger opera sobre INSERT en pagos y pago_imputaciones

INSERT INTO pagos (id, cliente_id, caja_sesion_id, metodo, monto, fecha, referencia, notas)
VALUES (
  '60000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000001',
  'transferencia', 450000, CURRENT_DATE - 18,
  'TRF-20240101-001', 'Pago total venta 1001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO pago_imputaciones (pago_id, venta_id, monto)
VALUES (
  '60000000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000001',
  450000
) ON CONFLICT DO NOTHING;

-- Pago de Grafisur (cubre venta 1008: $170.400)
INSERT INTO pagos (id, cliente_id, metodo, monto, fecha, referencia)
VALUES (
  '60000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000008',
  'efectivo', 170400, CURRENT_DATE - 8,
  NULL
) ON CONFLICT (id) DO NOTHING;

INSERT INTO pago_imputaciones (pago_id, venta_id, monto)
VALUES (
  '60000000-0000-0000-0000-000000000002',
  '50000000-0000-0000-0000-000000000008',
  170400
) ON CONFLICT DO NOTHING;

-- Pago parcial de Distribuidora Alvear (cuenta corriente activa)
INSERT INTO pagos (id, cliente_id, metodo, monto, fecha, referencia, notas)
VALUES (
  '60000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000001',
  'transferencia', 200000, CURRENT_DATE - 5,
  'TRF-20240506-003', 'Pago a cuenta'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- MOVIMIENTOS DE CAJA
-- ============================================================

INSERT INTO caja_movimientos (caja_sesion_id, tipo, metodo, monto, descripcion, pago_id) VALUES
  ('40000000-0000-0000-0000-000000000001', 'ingreso', 'efectivo',      170400, 'Cobro Venta #1008 - Imprenta Grafisur',        '60000000-0000-0000-0000-000000000002'),
  ('40000000-0000-0000-0000-000000000001', 'ingreso', 'transferencia', 200000, 'Cobro a cuenta - Distribuidora Alvear',        '60000000-0000-0000-0000-000000000003'),
  ('40000000-0000-0000-0000-000000000001', 'ingreso', 'efectivo',       48900, 'Cobro Venta #1004 - Juan Pérez Indumentaria',  NULL),
  ('40000000-0000-0000-0000-000000000001', 'egreso',  'efectivo',        4500, 'Retiro parcial de efectivo',                   NULL)
ON CONFLICT DO NOTHING;

-- ============================================================
-- MOVIMIENTOS EXTRA
-- ============================================================

INSERT INTO movimientos_extra (tipo, categoria, descripcion, monto, fecha, caja_sesion_id, comprobante) VALUES
  ('egreso',  'Papelería',  'Compra de resmas y bolígrafos',       2800,  CURRENT_DATE,     '40000000-0000-0000-0000-000000000001', 'FAC-B-00123'),
  ('egreso',  'Limpieza',   'Servicio de limpieza semanal',        8500,  CURRENT_DATE - 7, NULL,                                  NULL),
  ('ingreso', 'Otro',       'Reintegro seguro equipos oficina',   15000,  CURRENT_DATE - 3, NULL,                                  'REIMB-2024-05')
ON CONFLICT DO NOTHING;
