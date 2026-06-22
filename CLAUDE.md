# CLAUDE.md — Matafuegos ERP

## Identidad

| Campo | Valor |
|-------|-------|
| Nombre | Matafuegos ERP (sanidsupa) |
| Cliente | Antigravity — empresa de equipos matafuegos |
| Tipo | Comercio / PyME multisucursal |
| Supabase project-ref | `ebfluydlrsjdhayrhnja` |
| Deploy | Vercel (proyecto: matafuegos) |
| Estado | Producción activa |
| Repo | daroylucas-bytes-projects/matafuegos |

---

## Stack técnico

| Tecnología | Versión |
|-----------|---------|
| React | 18.2 |
| Vite | 5.1.4 |
| TypeScript | 5.2.2 |
| Tailwind CSS | 3.4.1 |
| Supabase JS | 2.39.7 |
| React Query | 5.24.1 |
| React Router | 6.22.1 |
| Sentry | 10.56.0 |
| React PDF | 4.5.1 |
| Recharts | 2.12.1 |
| PWA | vite-plugin-pwa 0.19.0 |

---

## Estructura de carpetas

```
src/
├── components/
│   ├── forms/          # Formularios (VentaForm, ClienteForm, etc.)
│   ├── layout/         # Layout, Sidebar, TopBar
│   ├── pdf/            # Generación de PDFs (VentaPDF, CuentaCorrientePDF)
│   ├── ui/             # Componentes base (Button, Modal, Table, Badge)
│   ├── CobranzaModal.tsx
│   ├── FacturaEmitirModal.tsx
│   └── FacturaDetalleModal.tsx
├── contexts/
│   ├── ConfigContext.tsx   # Config global de la app (colores, logo, datos empresa)
│   └── LocalContext.tsx    # Sucursal activa del usuario
├── hooks/
│   └── useAuth.ts
├── lib/
│   ├── supabase.ts
│   ├── sentry.ts          # Sentry inicializado con enabled flag
│   └── utils.ts
├── pages/                 # Una página por ruta
├── router/index.tsx       # Rutas protegidas por rol
└── types/
    ├── index.ts
    └── supabase.ts
```

---

## Base de datos — tablas principales

### Operaciones
| Tabla | Descripción |
|-------|-------------|
| `ventas` | Ventas con estado (presupuesto, confirmada, cancelada) |
| `venta_items` | Líneas de cada venta |
| `pagos` | Pagos de clientes |
| `pago_imputaciones` | Relación pago → venta |
| `compras` | Órdenes de compra a proveedores |
| `compra_items` | Líneas de cada compra |
| `pagos_proveedores` | Pagos a proveedores |
| `facturas_arca` | Facturas electrónicas emitidas por ARCA/AFIP |

### Inventario
| Tabla | Descripción |
|-------|-------------|
| `productos` | Catálogo de productos |
| `stock_por_local` | Stock actual por sucursal |
| `movimientos_stock` | Historial de movimientos de stock |

### Clientes y proveedores
| Tabla | Descripción |
|-------|-------------|
| `clientes` | Clientes con CUIT, cuenta corriente |
| `proveedores` | Proveedores |
| `cobranza_gestiones` | Gestiones de cobranza |

### Caja
| Tabla | Descripción |
|-------|-------------|
| `caja_sesiones` | Aperturas y cierres de caja |
| `caja_movimientos` | Movimientos de caja |
| `movimientos_extra` | Ingresos/egresos extras |

### Sistema
| Tabla | Descripción |
|-------|-------------|
| `profiles` | Usuarios con rol |
| `locales` | Sucursales |
| `usuario_locales` | Relación usuario → sucursales habilitadas |
| `configuracion` | Config global (singleton id=1): nombre_app, colores, logo, CUIT, servicios JSONB |
| `chat_mensajes` | Chat interno entre usuarios |
| `audit_log` | Log de actividad de usuarios (triggers automáticos) |

### Módulo Promociones IA
| Tabla | Descripción |
|-------|-------------|
| `promociones` | Promos generadas por IA (estado: pendiente/aprobada/rechazada/enviada) |
| `config_promo` | Instrucciones personalizadas por local |
| `identidad_visual` | Análisis de imágenes de marca por local |
| `saldo_marketing` | Wallet de créditos IA (singleton id=1) |
| `transacciones_marketing` | Historial de consumos y cargas de saldo |

### Vistas útiles
- `vista_cuenta_corriente` — saldo por cliente
- `vista_cuenta_corriente_proveedores`
- `vista_deuda_clientes_por_local`
- `vista_stock_por_local`
- `vista_kardex`
- `vista_ventas_resumen`
- `vista_productos_mas_vendidos`
- `vista_caja_detalle`
- `vista_resumen_proveedores`
- `vista_queries_lentas` — performance monitoring

---

## Roles de usuario

| Rol | Acceso |
|-----|--------|
| `superadmin` | Todo, incluyendo /superadmin |
| `admin` | Todo excepto superadmin |
| `vendedor` | Ventas, clientes, proveedores, compras, cobranzas |
| `cajero` | Caja, pagos |

---

## Rutas de la app

| Ruta | Página | Roles |
|------|--------|-------|
| `/dashboard` | Dashboard con KPIs y filtro por fecha | Todos |
| `/clientes` | Lista + detalle de clientes | admin, vendedor |
| `/cobranzas` | Gestión de cobranzas | admin, vendedor |
| `/proveedores` | Lista + detalle proveedores | admin, vendedor |
| `/productos` | Catálogo + detalle productos | admin |
| `/ventas` | Lista + detalle ventas + emitir factura ARCA | admin, vendedor |
| `/pagos` | Pagos de clientes | admin, cajero |
| `/compras` | Compras a proveedores | admin, vendedor |
| `/caja` | Apertura/cierre de caja | admin, cajero |
| `/usuarios` | Gestión de usuarios | admin |
| `/configuracion` | Config app + factura libre ARCA | admin |
| `/promociones` | Generador de promociones IA + wallet de saldo | admin |
| `/chat` | Chat interno | Todos |
| `/superadmin` | Config multi-tenant | superadmin |

---

## Variables de entorno

```env
# Frontend (Vercel + .env.local)
VITE_SUPABASE_URL=https://ebfluydlrsjdhayrhnja.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_ARCA_BACKEND_URL=https://arca.srv1055314.hstgr.cloud
VITE_SENTRY_DSN=<dsn>

# Build (Vercel + .env.local)
SENTRY_AUTH_TOKEN=<token>
SENTRY_ORG=dariodesarrollos
SENTRY_PROJECT=matafuegos-produccion

# Solo en Supabase Edge Function secrets (NUNCA en VITE_)
GEMINI_API_KEY=<api-key>           # Para módulo de promociones IA (pendiente)
SUPABASE_SERVICE_ROLE_KEY=<key>    # Solo server-side
```

---

## Infraestructura

| Servicio | Detalle |
|---------|---------|
| Frontend | Vercel — auto-deploy desde main |
| Base de datos | Supabase (plan Free) — us-west-1 |
| Backend ARCA | VPS Hostinger 72.60.252.11 — Docker + Traefik |
| HTTPS ARCA | `https://arca.srv1055314.hstgr.cloud` |
| Monitoreo | Sentry (errores + traces + session replay) |
| Logs DB | Supabase Observability → Data API |
| Audit log | Tabla `audit_log` con triggers en 7 tablas clave |

---

## Módulo ARCA (Facturación electrónica AFIP)

- Backend en VPS: `POST https://arca.srv1055314.hstgr.cloud/api/facturar`
- Parámetros: `{ ventaId, localId }`
- Config por local en `configuracion.servicios.arca.<local_id>`: punto_venta, CUIT, cert, key
- Certificados en `/app/afip_res/` dentro del contenedor Docker
- Credenciales ARCA pendientes de tramitar con AFIP

---

## Convenciones de código

- **TypeScript estricto** — sin `any` salvo excepciones justificadas
- **Componentes** en PascalCase, archivos `.tsx`
- **Hooks** con prefijo `use`, archivos `.ts`
- **Lazy loading** en todas las páginas del router
- **React Query** para todo fetch de datos — no useState + useEffect para datos remotos
- **react-hot-toast** para notificaciones de éxito/error
- **Lucide React** para iconos
- **cn()** de `lib/utils.ts` para clases condicionales de Tailwind
- Sin comentarios en código salvo WHY no obvio
- Sin `console.log` en producción

---

## Seguridad — reglas fijas

- NUNCA escribir keys/tokens en archivos de código
- NUNCA variables `VITE_*` con secrets (van al bundle del cliente)
- NUNCA `service_role_key` en el frontend
- NUNCA deshabilitar RLS
- `.env.local` en `.claudeignore` — Claude no puede leerlo
- `GEMINI_API_KEY` solo en Supabase Edge Function secrets

---

## Monitoreo configurado

| Layer | Herramienta |
|-------|------------|
| Errores frontend | Sentry (DSN activo, enabled en producción) |
| Trazas HTTP | Sentry Browser Tracing (20% sample) |
| Session Replay | Sentry (5% sesiones, 100% en error) |
| Actividad usuarios | `audit_log` con triggers en ventas, facturas, productos, stock, clientes, pagos, compras |
| Queries lentas | Vista `vista_queries_lentas` (pg_stat_statements) |
| Errores API | Supabase Observability → Data API |

---

## Trabajo en progreso / Pendientes

### Módulo de Promociones IA — IMPLEMENTADO (pendiente prueba en producción)

**Objetivo:** Generar promociones automáticas con Gemini basadas en datos del negocio. Módulo genérico y clonable para distintos tipos de negocios.

**Referencia:** Basado en el módulo del proyecto `dashboardpizzalibre` (repo: daroylucas-bytes/dashboardpizzalibre), adaptado sin n8n — llamadas directas a Gemini desde Edge Functions.

**Arquitectura:**
```
Frontend (React) → Hook usePromociones
                       ↓
              Supabase Edge Functions
                       ↓
              API Gemini (texto + imagen)
                       ↓
              Tablas Supabase + Storage (bucket: marketing)
```

**Tablas creadas:**
- `promociones` — promos generadas (estado: pendiente/aprobada/rechazada/enviada)
- `config_promo` — instrucciones personalizadas por local
- `identidad_visual` — análisis de imágenes de marca subidas por el usuario
- `saldo_marketing` — wallet de créditos (singleton id=1)
- `transacciones_marketing` — historial de consumos y cargas

**RPCs creados:**
- `cargar_saldo(monto_carga, descripcion_carga)`
- `descontar_saldo(monto_descuento, tipo_descuento, descripcion_descuento)`
- `resumen_para_promo(p_local_id)` — agrega productos top, stock bajo, ventas 7 días, config e identidad visual

**Edge Functions deployadas (Supabase, no VPS):**
- `generar-promos` — llama Gemini 1.5 Flash con contexto del negocio → guarda 4 propuestas
- `generar-imagen-promo` — genera imagen con Gemini 2.0 Flash → sube a Storage bucket `marketing`
- `analizar-identidad-visual` — analiza imágenes de marca con Gemini visión → guarda en `identidad_visual`

**Datos del ERP que alimentan la IA:**
- `ventas` + `venta_items` → productos más vendidos últimos 30 días
- `stock_por_local` → productos con stock bajo (< 5 unidades)
- `configuracion` → nombre empresa, dirección
- `identidad_visual` → instrucciones de marca por local

**Frontend creado:**
- `src/hooks/usePromociones.ts` — estado + fetch + acciones
- `src/pages/Promociones.tsx` — página con tabs Propuestas/Aprobadas + saldo widget
- Ruta `/promociones` con rol `admin`
- Ítem "Promociones" en Sidebar con ícono Megaphone

**Costos por operación:**
- Generar 4 promos: $600 créditos
- Generar imagen: $1250 créditos
- Analizar identidad visual: $500 créditos
- Cargas de saldo: manual por ahora → integración futura con Mercado Pago

**Secrets configurados en Supabase Edge Functions:**
- `GEMINI_API_KEY` — Google AI Studio
- `SUPABASE_SERVICE_ROLE_KEY` — service role del proyecto

**Pendiente:**
- Deploy en Vercel y prueba end-to-end
- Integración Mercado Pago para recargar saldo

### Integración Mercado Pago — PLANIFICADO (pendiente módulo promociones)
- Para recarga de saldo de marketing
- Requiere endpoint server-side (VPS o Edge Function) — no puede ir en VITE_
- Opciones evaluadas: Checkout Pro, Brick de tarjeta, QR/Link de pago

### Tests de lógica de negocio — PLANIFICADO
- Vitest para lógica pura (saldos, imputaciones, stock)
- Prioridad: cuenta corriente → stock → caja
- Requiere extraer lógica a funciones puras en `src/lib/`

### ARCA — Pendiente credenciales
- Backend Docker funcionando con HTTPS
- Esperando certificado + clave privada de AFIP del cliente
- Punto de venta a configurar en `configuracion.servicios.arca`
