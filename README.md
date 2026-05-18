# GestApp - PWA Management System

Scaffolded with React 18, TypeScript, Vite, Tailwind CSS v3, and Supabase.

## Setup Instructions

1. **Clone the repository** (if not already in the project directory).
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Environment Variables**:
   Create a `.env.local` file (already created during scaffolding) with the following content:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
4. **Local Supabase (Optional)**:
   If you are using a local Supabase instance:
   ```bash
   npx supabase start
   ```
5. **Run the development server**:
   ```bash
   npm run dev
   ```

## Design System

The project uses a custom design system based on Material 3 color palettes and specific typography:
- **Primary Color**: `#4f46e5` (Indigo)
- **Font**: Inter (400, 500, 600, 700)
- **PWA**: Configured with `vite-plugin-pwa` for offline support.

## Local Setup

```bash
# Start Supabase
supabase start

# Apply migrations
supabase migration up

# Seed test user
supabase db reset   # resets DB and auto-runs seed.sql if configured

# OR run seed manually:
supabase db execute --file supabase/seed.sql

# Start frontend
npm run dev
```

### Test User Credentials
- **Email**: admin@gestapp.com
- **Password**: admin123456

## Project Structure

- `src/components/ui`: Reusable UI primitives (Button, Input, Table, etc.)
- `src/components/layout`: Layout components (Sidebar, TopBar, Layout)
- `src/lib`: Shared utilities and Supabase client
- `src/hooks`: Custom hooks (useAuth)
- `src/pages`: Page components
- `src/router`: Routing logic and Protected Routes
- `src/types`: TypeScript interfaces and types
