# Entorno Local Supabase — Matafuegos

## Arrancar el proyecto

```powershell
cd c:\Users\dario\.gemini\antigravity\scratch\Matafuegos
npx supabase start
```

Una vez levantado, iniciá la app:

```powershell
npm run dev
```

## URLs del entorno local

| Servicio    | URL                              |
|-------------|----------------------------------|
| Studio (UI) | http://127.0.0.1:54323           |
| API REST    | http://127.0.0.1:54321/rest/v1   |
| Base de datos (psql) | postgresql://postgres:postgres@127.0.0.1:54322/postgres |

## Parar el entorno

```powershell
npx supabase stop
```

Los datos **se conservan** entre sesiones mientras no uses `--no-backup`.

## Resetear todo a cero (borra datos)

```powershell
npx supabase db reset --local
```

Esto recorre todas las migraciones desde cero en orden y carga el seed.sql. Útil si el esquema queda inconsistente.

---

## Migraciones aplicadas

| Archivo | Contenido |
|---------|-----------|
| `20260514135207_schema_inicial.sql` | Esquema base: profiles, clientes, proveedores, productos, ventas, venta_items, pagos, caja, vistas y RLS |
| `20260515013402_fix_profiles_rls_trigger.sql` | Fix RLS en profiles para el trigger de creación de usuario |
| `20260515120000_modulo_proveedores.sql` | Módulo de compras a proveedores: compras, compra_items, pagos_proveedores, pago_proveedor_imputaciones, vista_cuenta_corriente_proveedores |
| `20260515130000_sistema_stock.sql` | Sistema de stock: tabla movimientos_stock (Kardex), triggers automáticos de entrada/salida, vista_kardex |

## Agregar una migración nueva

1. Crear el archivo en `supabase/migrations/` con timestamp como nombre: `YYYYMMDDHHMMSS_descripcion.sql`
2. Ejecutarla desde el Studio (http://127.0.0.1:54323 → SQL Editor) o via CLI:
   ```powershell
   npx supabase db push --local
   ```
3. Si la ejecutaste manualmente desde el Studio, registrarla en el historial:
   ```powershell
   npx supabase migration repair --status applied YYYYMMDDHHMMSS --local
   ```

---

## Notas importantes

- La migración `20260515120000` y `20260515130000` fueron ejecutadas manualmente desde el Studio y luego registradas con `migration repair`.
- La columna `pago_proveedor_id` en `caja_movimientos` fue agregada por Supabase Studio automáticamente al crear la FK — no está en el archivo de migración pero sí en la DB.
- Los productos con `es_servicio = true` son ignorados por todos los triggers de stock.
