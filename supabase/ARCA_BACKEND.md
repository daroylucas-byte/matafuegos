# Backend ARCA — Middleware de Facturación Electrónica

> Documentación del servidor Node.js desplegado en la VPS de Hostinger.
> Leer antes de modificar el flujo de facturación o el frontend.

---

## Arquitectura

```
PWA Frontend (React)
      │
      │  POST /api/facturar { ventaId, localId }
      ▼
Backend Node.js (VPS Hostinger)          ← Este servidor
  IP: 72.60.252.11  Puerto: 3001
  Path: /root/arca-backend/
      │
      ├── Lee config ARCA desde Supabase (certificado + clave privada)
      ├── Autentica con WSAA (Token de Acceso)
      ├── Emite comprobante via WSFEv1 (SOAP)
      └── Guarda CAE en tabla facturas_arca
      │
      ▼
Supabase (tabla: facturas_arca, ventas)
      │
      ▼
Servidores ARCA/AFIP (WSAA + WSFEv1)
```

---

## Servidor VPS

| Campo        | Valor                          |
|--------------|-------------------------------|
| Proveedor    | Hostinger                     |
| OS           | Ubuntu 24.04 LTS              |
| IP pública   | 72.60.252.11                  |
| Puerto       | 3001                          |
| Path         | /root/arca-backend/           |
| Runtime      | Node.js v20 (via NVM)         |
| Process mgr  | PM2 (auto-start en reboot)    |

### Acceso SSH
```bash
ssh root@72.60.252.11
```

### Comandos PM2 útiles
```bash
pm2 status                    # ver estado del proceso
pm2 logs arca-backend         # ver logs en tiempo real
pm2 restart arca-backend      # reiniciar el servidor
pm2 stop arca-backend         # detener
```

---

## Estructura de archivos en la VPS

```
/root/arca-backend/
├── index.js          # servidor principal Express
├── .env              # variables de entorno (NO commitear)
├── package.json
├── node_modules/
├── afip_res/         # archivos internos del SDK afip.js
└── afip_ta/          # tokens de acceso cacheados (TA.xml)
```

---

## Variables de entorno (.env)

```env
SUPABASE_URL=https://ebfluydlrsjdhayrhnja.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
PORT=3001
```

> La `SUPABASE_SERVICE_ROLE_KEY` tiene acceso total a la base de datos sin RLS.
> Nunca exponerla en el frontend.

---

## Endpoints

### GET /health
Verifica que el servidor está corriendo.

**Response:**
```json
{ "status": "ok", "timestamp": "2026-05-19T23:10:33.833Z" }
```

### POST /api/facturar
Emite una factura electrónica en ARCA y registra el CAE.

**Request body:**
```json
{
  "ventaId": "uuid-de-la-venta",
  "localId": "uuid-del-local"
}
```

**Response exitoso:**
```json
{
  "success": true,
  "factura": { ...registro de facturas_arca }
}
```

**Response de error:**
```json
{ "error": "descripción del error" }
```

**Lógica interna:**
1. Lee configuración ARCA del local desde `configuracion.servicios.arca[localId]`
2. Obtiene la venta y el cliente desde Supabase
3. Inicializa el SDK `@afipsdk/afip.js` con el `.crt` y `.key` del Super Admin
4. Determina tipo de comprobante: Factura A (tipo 1) si el cliente es Responsable Inscripto, Factura B (tipo 6) para el resto
5. Obtiene el último número de comprobante autorizado por ARCA
6. Construye y envía el comprobante electrónico al WSFEv1
7. Guarda el CAE y fecha de vencimiento en `facturas_arca`
8. Actualiza el estado de la venta a `'facturado'`
9. En caso de error, registra un registro con `estado: 'rechazada'` y el mensaje de error

---

## Dependencias npm

| Paquete              | Uso                                      |
|----------------------|------------------------------------------|
| express              | Servidor HTTP                            |
| @afipsdk/afip.js     | SDK para WSAA y WSFEv1 de ARCA/AFIP      |
| @supabase/supabase-js| Cliente Supabase (con Service Role Key)  |
| dotenv               | Carga variables de entorno desde .env    |
| ws                   | WebSocket para Node.js < 22 (requerido por supabase-js) |

---

## Configuración ARCA en el Super Admin

Las credenciales ARCA se configuran por sucursal desde la pantalla **Configuración → Super Admin → ARCA**.

Se guardan en `configuracion.servicios.arca[local_id]` con esta estructura:

```json
{
  "punto_venta": 1,
  "modo": "homologacion",
  "cuit": "20-12345678-9",
  "iibb": "123456789",
  "iva": "responsable_inscripto",
  "inicio_actividades": "2020-01-01",
  "certificado_crt": "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----",
  "clave_privada_key": "-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
}
```

> **Seguridad:** El certificado y la clave privada viven en Supabase pero **solo el backend de la VPS los lee** usando la Service Role Key. El frontend nunca los recibe directamente.

---

## Flujo completo de una facturación

```
Usuario presiona "Facturar ARCA" en VentaDetail
      │
      ▼
FacturaEmitirModal → confirma datos del receptor
      │
      │  POST http://72.60.252.11:3001/api/facturar
      ▼
Backend VPS
  ├── Valida ventaId y localId
  ├── Lee arcaConfig de Supabase
  ├── Instancia Afip({ CUIT, cert, key, production })
  ├── getLastVoucher(punto_venta, tipo) → nextNumber
  ├── createVoucher(data) → { CAE, CAEVto }
  └── INSERT facturas_arca + UPDATE ventas.estado = 'facturado'
      │
      ▼
Frontend recibe { success: true, factura: {...} }
      │
      ▼
FacturaDetalleModal muestra el comprobante con CAE
```

---

## Estados de facturas_arca

| Estado     | Descripción                                      |
|------------|--------------------------------------------------|
| pendiente  | Guardada localmente, aún no enviada a ARCA       |
| aprobada   | CAE obtenido correctamente                       |
| rechazada  | ARCA rechazó el comprobante (ver error_mensaje)  |

---

## Pasos pendientes

- [ ] Configurar HTTPS con nginx + Let's Encrypt (dominio propio)
- [ ] Abrir puerto 3001 en firewall de Hostinger
- [ ] Conectar el frontend: reemplazar simulación en `FacturaEmitirModal.tsx` por llamada real al endpoint
- [ ] Agregar variable de entorno `VITE_ARCA_BACKEND_URL` en el frontend
- [ ] Pruebas en homologación con certificado de prueba de AFIP
- [ ] Paso a producción con certificado real

---

## Cómo reiniciar el servidor si algo falla

```bash
ssh root@72.60.252.11
cd /root/arca-backend
pm2 restart arca-backend
pm2 logs arca-backend
```

Si PM2 no está disponible (reboot sin startup configurado):
```bash
source ~/.nvm/nvm.sh
cd /root/arca-backend
pm2 start index.js --name arca-backend
pm2 save
```
