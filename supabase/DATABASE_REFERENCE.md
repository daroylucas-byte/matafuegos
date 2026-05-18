# Database Reference — Matafuegos App

> Documento de referencia para el desarrollo del frontend.
> Leer ANTES de generar cualquier migración, tipo TypeScript o query.

---

## Regla fundamental

**No sugerir cambios al esquema sin consultarlo primero.**
La base de datos ya está diseñada. Antes de agregar columnas o tablas, verificar que no exista ya la información en otra tabla.

---

## Stack

- **Base de datos:** PostgreSQL 17 via Supabase local (Docker)
- **Auth:** Supabase Auth — `auth.users` es la tabla de autenticación
- **RLS:** Row Level Security activo en todas las tablas
- **Studio local:** http://127.0.0.1:54323
- **API REST:** http://127.0.0.1:54321
- **Frontend:** React + TypeScript + Supabase JS client

---

## Arquitectura general

Cada cliente tiene **su propia instancia de Supabase** (no es multi-tenant compartido).
Dentro de cada instancia, un cliente puede tener **múltiples locales/sucursales**.

```
instancia Supabase (1 por cliente)
└── locales (N sucursales)
    ├── ventas, compras, pagos, caja → filtrados por local_id
    └── productos, clientes, proveedores → globales (sin local_id)
```

---

## ENUMs

```sql
user_rol:              superadmin | admin | vendedor | cajero | visor
venta_estado:          presupuesto | confirmado | en_preparacion | entregado | facturado | cobrado | cancelado
compra_estado:         borrador | recibida | pagada | cancelada
pago_metodo:           efectivo | transferencia | tarjeta_debito | tarjeta_credito | cheque | credito_cliente
movimiento_tipo:       ingreso | egreso
movimiento_stock_tipo: venta | compra | ajuste
```

---

## Tablas

### `profiles` — Usuarios del sistema
Espejo de `auth.users`. Se crea automáticamente via trigger al registrar un usuario.

| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | = auth.users.id |
| nombre | text | |
| email | text | |
| rol | user_rol | default: vendedor |
| activo | boolean | default: true |
| created_at / updated_at | timestamptz | |

**NO tiene `local_id`.** La relación usuario↔local está en `usuario_locales`.

---

### `locales` — Sucursales del cliente

| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | |
| nombre | text | |
| direccion | text | nullable |
| telefono | text | nullable |
| email | text | nullable |
| activo | boolean | default: true |
| created_at / updated_at | timestamptz | |

**Local Principal fijo:** `id = '00000000-0000-0000-0000-000000000001'` — no eliminar ni desactivar.

RLS: todos leen, `superadmin` y `admin` pueden escribir.

---

### `usuario_locales` — Relación usuario ↔ local

| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | |
| usuario_id | UUID FK → profiles.id | CASCADE DELETE |
| local_id | UUID FK → locales.id | CASCADE DELETE |
| created_at | timestamptz | |

**UNIQUE (usuario_id, local_id)**

Un usuario puede estar en **varios locales**. El rol es único para toda la instancia (está en `profiles.rol`).

**Lógica de local activo en el frontend:**
```
login
  → cargar usuario_locales del usuario
  → si tiene 1 local: seleccionarlo automáticamente
  → si tiene varios: mostrar selector en el header
  → superadmin/admin: opción adicional "Todos los locales" (local_id = null)
```

---

### `configuracion` — Config global de la instancia
Tabla con **una sola fila** (id = 1).

| Columna | Tipo | Notas |
|---------|------|-------|
| id | integer PK | siempre = 1 |
| nombre_app | text | default: 'Gestión Pro' |
| color_primario | text | hex, default: '#3525cd' |
| color_secundario | text | hex, default: '#006c49' |
| logo_url | text | nullable, URL en Storage |
| razon_social | text | nullable |
| cuit | text | nullable |
| direccion | text | nullable |
| email_empresa | text | nullable |
| telefono | text | nullable |
| servicios | jsonb | estructura con módulos e integraciones (ver abajo) |
| updated_at | timestamptz | |

**Estructura de `servicios`:**
```json
{
  "modulos": {
    "dashboard":   true,
    "clientes":    true,
    "ventas":      true,
    "proveedores": true,
    "compras":     true,
    "caja":        true,
    "catalogo":    true,
    "usuarios":    true
  },
  "integraciones": {
    "arca": false,
    "is":   false
  }
}
```

`modulos` controla la **visibilidad en el sidebar** para todos los usuarios.
Solo el superadmin puede modificar estos valores desde `/superadmin`.
Si un módulo es `false`, el ítem desaparece del sidebar pero las rutas siguen funcionando.
`integraciones` son placeholders — no tienen funcionalidad activa todavía.

RLS: todos leen, `superadmin` y `admin` pueden hacer UPDATE.

---

### `productos` — Catálogo global (sin local_id)

| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | |
| codigo | text | UNIQUE, nullable |
| nombre | text | |
| descripcion | text | nullable |
| precio | numeric(12,2) | precio de venta |
| costo | numeric(12,2) | costo de compra |
| stock | numeric(12,3) | **LEGACY** — no usar para mostrar stock |
| stock_minimo | numeric(12,3) | umbral de alerta de stock bajo, default: 0 |
| unidad | text | u., kg, lt, m, serv. |
| es_servicio | boolean | si true: ignorar stock |
| activo | boolean | |

**⚠️ `productos.stock` es legacy.** El stock real está en `stock_por_local`.
Para mostrar stock siempre consultar `stock_por_local` filtrado por `local_id`.

`stock_minimo` se usa para alertas: alerta cuando `stock_por_local.stock <= productos.stock_minimo`.
Con `stock_minimo = 0` (default) solo alerta cuando hay stock agotado.

---

### `stock_por_local` — Stock por producto × local

| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | |
| producto_id | UUID FK → productos.id | CASCADE DELETE |
| local_id | UUID FK → locales.id | CASCADE DELETE |
| stock | numeric(12,3) | |
| updated_at | timestamptz | |

**UNIQUE (producto_id, local_id)**

Los triggers actualizan esta tabla automáticamente — **nunca actualizar manualmente desde el frontend**:
- Venta confirmada → descuenta stock del local de la venta
- Compra item insertado → suma stock al local de la compra
- Venta cancelada (desde ≥ confirmado) → devuelve stock
- Compra cancelada → descuenta stock

---

### `clientes` — Global (sin local_id)

| Columna | Tipo |
|---------|------|
| id | UUID PK |
| razon_social | text |
| nombre_fantasia | text nullable |
| cuit | text nullable |
| email | text nullable |
| telefono | text nullable |
| direccion | text nullable |
| localidad | text nullable |
| limite_credito | numeric(12,2) |
| activo | boolean |
| notas | text nullable |

---

### `proveedores` — Global (sin local_id)

Mismas columnas que `clientes` excepto que **no tiene `limite_credito`**.

---

### `ventas` — Por local

| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | |
| numero | integer | autoincremental UNIQUE |
| cliente_id | UUID FK → clientes.id | nullable (consumidor final) |
| vendedor_id | UUID FK → profiles.id | nullable |
| estado | venta_estado | default: presupuesto |
| fecha | date | |
| fecha_entrega | date | nullable |
| subtotal | numeric(12,2) | |
| descuento | numeric(12,2) | |
| total | numeric(12,2) | |
| saldo_pendiente | numeric(12,2) | se recalcula via trigger — no actualizar manualmente |
| notas | text | nullable |
| local_id | UUID FK → locales.id | **REQUERIDO** |
| created_at / updated_at | timestamptz | |

**Trigger stock:** al pasar a `confirmado` → descuenta; al `cancelado` desde activo → devuelve.

---

### `venta_items` — Ítems de venta

| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | |
| venta_id | UUID FK → ventas.id | CASCADE DELETE |
| producto_id | UUID FK → productos.id | nullable (ítem libre) |
| descripcion | text | |
| cantidad | numeric(12,3) | |
| precio_unitario | numeric(12,2) | |
| descuento | numeric(12,2) | |
| subtotal | numeric(12,2) | |

---

### `pagos` — Cobros a clientes (por local)

| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | |
| cliente_id | UUID FK → clientes.id | |
| caja_sesion_id | UUID FK → caja_sesiones.id | nullable |
| metodo | pago_metodo | |
| monto | numeric(12,2) | CHECK > 0 |
| fecha | date | |
| referencia | text | nullable |
| notas | text | nullable |
| local_id | UUID FK → locales.id | **REQUERIDO** |

---

### `pago_imputaciones` — Liga pagos a ventas específicas

| Columna | Tipo |
|---------|------|
| id | UUID PK |
| pago_id | UUID FK → pagos.id CASCADE DELETE |
| venta_id | UUID FK → ventas.id |
| monto | numeric(12,2) CHECK > 0 |

**Trigger:** al INSERT/UPDATE/DELETE recalcula `ventas.saldo_pendiente` y cambia estado a `cobrado` si saldo ≤ 0.

---

### `compras` — Facturas de proveedores (por local)

| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | |
| numero | integer | autoincremental UNIQUE |
| proveedor_id | UUID FK → proveedores.id | |
| receptor_id | UUID FK → profiles.id | nullable |
| estado | compra_estado | default: borrador |
| fecha | date | |
| fecha_vencimiento | date | nullable |
| numero_factura | text | nullable — formato libre, ej: "Factura C 0001-00001234" |
| subtotal | numeric(12,2) | |
| total | numeric(12,2) | |
| saldo_pendiente | numeric(12,2) | se recalcula via trigger — no actualizar manualmente |
| notas | text | nullable |
| local_id | UUID FK → locales.id | **REQUERIDO** |

**No existen** las columnas `tipo_comprobante` ni `nro_comprobante` — usar `numero_factura` para todo.

---

### `compra_items` — Ítems de compra

| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | |
| compra_id | UUID FK → compras.id | CASCADE DELETE |
| producto_id | UUID FK → productos.id | nullable |
| descripcion | text | |
| cantidad | numeric(12,3) | |
| precio_unitario | numeric(12,2) | — NO es `costo_unitario` |
| subtotal | numeric(12,2) | |

---

### `pagos_proveedores` — Pagos a proveedores (por local)

| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | |
| proveedor_id | UUID FK → proveedores.id | |
| caja_sesion_id | UUID FK → caja_sesiones.id | nullable |
| metodo | pago_metodo | |
| monto | numeric(12,2) | CHECK > 0 |
| fecha | date | |
| referencia | text | nullable |
| notas | text | nullable |
| local_id | UUID FK → locales.id | **REQUERIDO** |
| compra_prioritaria_id | UUID FK → compras.id | nullable — prioriza una compra en la imputación FIFO |

---

### `pago_proveedor_imputaciones` — Liga pagos a compras

| Columna | Tipo |
|---------|------|
| id | UUID PK |
| pago_id | UUID FK → pagos_proveedores.id CASCADE DELETE |
| compra_id | UUID FK → compras.id |
| monto | numeric(12,2) CHECK > 0 |

**Trigger:** recalcula `compras.saldo_pendiente` y cambia estado a `pagada` si saldo ≤ 0.
**No insertar manualmente** — el trigger `trg_pago_proveedor_auto_imputar` lo hace automáticamente al insertar en `pagos_proveedores`.

---

### `caja_sesiones` — Sesiones de caja (por local)

| Columna | Tipo |
|---------|------|
| id | UUID PK |
| cajero_id | UUID FK → profiles.id |
| apertura_at | timestamptz |
| cierre_at | timestamptz nullable |
| monto_apertura | numeric(12,2) |
| monto_cierre_real | numeric(12,2) nullable |
| monto_cierre_sistema | numeric(12,2) nullable |
| diferencia | numeric(12,2) nullable |
| estado | text CHECK IN ('abierta','cerrada') |
| notas | text nullable |
| local_id | UUID FK → locales.id |

Cada local tiene su propia sesión de caja independiente. Siempre filtrar por `local_id`.

---

### `caja_movimientos` — Movimientos dentro de una sesión

| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | |
| caja_sesion_id | UUID FK → caja_sesiones.id | |
| tipo | movimiento_tipo | ingreso/egreso |
| metodo | pago_metodo | |
| monto | numeric(12,2) CHECK > 0 | |
| descripcion | text | |
| pago_id | UUID FK → pagos.id | nullable |
| pago_proveedor_id | UUID FK → pagos_proveedores.id | nullable |

No tiene `local_id` propio — hereda el local a través de `caja_sesion_id`.

---

### `movimientos_extra` — Gastos/ingresos varios (por local)

| Columna | Tipo |
|---------|------|
| id | UUID PK |
| tipo | movimiento_tipo |
| categoria | text nullable |
| monto | numeric(12,2) CHECK > 0 |
| descripcion | text |
| fecha | date |
| caja_sesion_id | UUID FK → caja_sesiones.id nullable |
| comprobante | text nullable |
| local_id | UUID FK → locales.id |

---

### `movimientos_stock` — Kardex de stock

| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | |
| producto_id | UUID FK → productos.id | |
| tipo | movimiento_stock_tipo | venta / compra / ajuste |
| cantidad | numeric(12,3) | positivo = entrada, negativo = salida |
| stock_resultante | numeric(12,3) | snapshot del stock post-movimiento en ese local |
| referencia_id | UUID | nullable — venta_id o compra_id |
| local_id | UUID FK → locales.id | nullable — local donde ocurrió el movimiento |
| descripcion | text | |
| created_at | timestamptz | |

---

## Vistas

| Vista | Descripción | Filtrable por local_id |
|-------|-------------|------------------------|
| `vista_cuenta_corriente` | Saldo deudor por cliente — **global**, 1 fila por cliente | ❌ No tiene local_id |
| `vista_cuenta_corriente_proveedores` | Saldo deudor por proveedor — **global**, 1 fila por proveedor | ❌ No tiene local_id |
| `vista_deuda_clientes_por_local` | Saldo deudor por cliente × local | ✅ local_id |
| `vista_resumen_proveedores` | Todos los campos de proveedores + totales financieros | ❌ Global |
| `vista_ventas_resumen` | Cantidad y monto de ventas agrupado por estado | ❌ Global |
| `vista_caja_detalle` | Join de sesiones de caja con sus movimientos | ✅ via caja_sesion_id |
| `vista_kardex` | Kardex completo con nombre, código de producto y local | ✅ local_id |
| `vista_stock_por_local` | Stock de cada producto en cada local (CROSS JOIN) | ✅ local_id |
| `vista_productos_mas_vendidos` | Productos vendidos con cantidad y monto, por local y fecha | ✅ local_id + fecha |

**Regla importante:** `vista_cuenta_corriente` y `vista_cuenta_corriente_proveedores` son globales.
Para deuda filtrada por sucursal usar `vista_deuda_clientes_por_local` o sumar `saldo_pendiente`
directamente desde `ventas`/`compras` con `.eq('local_id', activeLocalId)`.

---

## Roles y permisos (RLS)

| Rol | Permisos |
|-----|----------|
| `superadmin` | Todo sin restricciones, gestión de módulos y sucursales |
| `admin` | Todo excepto página /superadmin |
| `vendedor` | clientes, proveedores, productos (lectura), ventas, compras |
| `cajero` | pagos, pagos_proveedores, caja_sesiones, caja_movimientos |
| `visor` | Solo SELECT en todo |

Función helper: `mi_rol()` — devuelve el rol del usuario autenticado actual.

---

## Funciones y triggers

| Nombre | Qué hace |
|--------|----------|
| `set_updated_at()` | Trigger BEFORE UPDATE en todas las tablas con updated_at |
| `handle_new_user()` | Trigger AFTER INSERT en auth.users → crea perfil en profiles |
| `mi_rol()` | Retorna user_rol del usuario autenticado |
| `recalcular_saldo_venta()` | Trigger en pago_imputaciones → actualiza ventas.saldo_pendiente |
| `recalcular_saldo_compra()` | Trigger en pago_proveedor_imputaciones → actualiza compras.saldo_pendiente |
| `registrar_movimiento_stock(p_producto_id, p_local_id, p_cantidad, p_tipo, p_referencia_id, p_descripcion)` | Upsert en stock_por_local + inserta en movimientos_stock. **6 parámetros obligatorios.** Ignora servicios. |
| `trg_ventas_stock()` | AFTER UPDATE estado en ventas → descuenta/devuelve stock en el local de la venta |
| `trg_compra_items_stock()` | AFTER INSERT/DELETE en compra_items → suma/descuenta stock en el local de la compra |
| `trg_compras_cancelacion_stock()` | AFTER UPDATE estado en compras → revierte stock si cancelada |
| `imputar_pago_proveedor_fifo(p_pago_id)` | Distribuye un pago en compras pendientes por FIFO (fecha ASC), respetando compra_prioritaria_id |
| `aplicar_credito_proveedor(p_compra_id)` | Toma pagos sobrantes del proveedor y los imputa a una compra puntual. Llamar via RPC desde el frontend. |
| `trg_auto_imputar_pago()` | AFTER INSERT en pagos_proveedores → llama imputar_pago_proveedor_fifo automáticamente |
| `trg_auto_imputar_compra()` | AFTER INSERT/UPDATE estado en compras → llama aplicar_credito_proveedor si hay crédito disponible |

---

## Sistema FIFO de imputación de pagos a proveedores

Al insertar en `pagos_proveedores` el trigger distribuye el monto automáticamente:
1. Si `compra_prioritaria_id` está seteado → paga esa compra primero
2. Luego paga las compras restantes ordenadas por `fecha ASC` (más antigua primero)
3. Si sobra monto → queda como crédito (saldo_deudor negativo en las vistas)

**El frontend NO debe insertar en `pago_proveedor_imputaciones` manualmente.**

Para detectar crédito disponible de un proveedor:
```ts
const { data } = await supabase
  .from('vista_resumen_proveedores')
  .select('saldo_deudor')
  .eq('id', proveedorId)
  .single()
const credito = (data?.saldo_deudor ?? 0) < 0 ? Math.abs(data.saldo_deudor) : 0
```

Para aplicar crédito a una compra puntual:
```ts
await supabase.rpc('aplicar_credito_proveedor', { p_compra_id: id })
```

---

## Datos de prueba disponibles

| Entidad | Cantidad |
|---------|----------|
| Usuarios (profiles) | 3 — admin, vendedor, cajero |
| Locales | 2 — Local Principal, Sucursal Norte |
| Clientes | 10 |
| Proveedores | 5 |
| Productos | 10 (8 físicos + 2 servicios) |
| Ventas | 8 (todos los estados representados) |
| Compras | 4 (todos los estados representados) |
| Stock (stock_por_local) | 11 registros |
| Sesión de caja | 1 abierta |

**Credenciales de prueba:**
- admin@gestapp.com / admin123456 (rol: admin)
- vendedor@gestapp.com / admin123456 (rol: vendedor)
- cajero@gestapp.com / admin123456 (rol: cajero)

---

## Reglas de negocio importantes

1. **`profiles` NO tiene `local_id`** — la relación usuario↔local está en `usuario_locales` (many-to-many)
2. **`productos.stock` es legacy** — siempre usar `stock_por_local` para mostrar/actualizar stock
3. **`productos`, `clientes` y `proveedores` son globales** — no tienen `local_id`
4. **Todas las tablas operativas requieren `local_id`**: ventas, compras, pagos, pagos_proveedores, caja_sesiones, movimientos_extra
5. **Los triggers de stock ignoran servicios** (`es_servicio = true`)
6. **`configuracion` siempre tiene una sola fila** con id = 1
7. **`saldo_pendiente` se recalcula automáticamente via trigger** — nunca actualizar manualmente
8. **Al crear venta/compra/pago siempre incluir `local_id`** del local activo en el contexto
9. **`compra_items.precio_unitario`** — no existe `costo_unitario`, el campo correcto es `precio_unitario`
10. **`compras.numero_factura`** — no existen `tipo_comprobante` ni `nro_comprobante`, usar este campo para todo
11. **`caja_movimientos` no tiene `local_id`** — hereda el local via `caja_sesion_id`
12. **`vista_cuenta_corriente` y `vista_cuenta_corriente_proveedores` son globales** — no filtrar por `local_id`
13. **Local Principal** (`id = '00000000-0000-0000-0000-000000000001'`) no se puede eliminar ni desactivar
14. **Módulos del sidebar** se controlan via `configuracion.servicios.modulos` — solo visibilidad, no funcionalidad
