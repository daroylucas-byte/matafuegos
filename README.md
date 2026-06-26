# Matafuegos ERP — Antigravity

Sistema ERP para gestión de comercio de equipos matafuegos. PWA multi-sucursal con facturación electrónica AFIP/ARCA.

## Stack

- React 18 + TypeScript + Vite + Tailwind CSS
- Supabase (BD + Auth + Edge Functions + Storage)
- Facturación ARCA/AFIP — backend Node.js en VPS

## Setup local

1. Cloná el repo
2. Instalá dependencias:
   ```bash
   npm install
   ```
3. Creá `.env.local` con:
   ```env
   VITE_SUPABASE_URL=https://ebfluydlrsjdhayrhnja.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon-key>
   VITE_ARCA_BACKEND_URL=https://arca.srv1055314.hstgr.cloud
   VITE_SENTRY_DSN=<dsn>
   SENTRY_AUTH_TOKEN=<token>
   SENTRY_ORG=dariodesarrollos
   SENTRY_PROJECT=matafuegos-produccion
   ```
4. Corré el servidor de desarrollo:
   ```bash
   npm run dev
   ```

## Deploy

- **Frontend**: Vercel — auto-deploy desde `main`
- **Backend ARCA**: VPS Hostinger `72.60.252.11` — PM2 + nginx
  - Código: `/root/arca-backend/index.js`
  - Reiniciar: `pm2 restart arca-backend --update-env`
  - URL: `https://arca.srv1055314.hstgr.cloud`

## Infraestructura

| Servicio | Detalle |
|---------|---------|
| Frontend | Vercel |
| Base de datos | Supabase `ebfluydlrsjdhayrhnja` |
| Backend ARCA | VPS Hostinger — PM2 + Node.js + nginx |
| Monitoreo | Sentry |

Ver `CLAUDE.md` para documentación técnica completa.
