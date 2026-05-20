import React from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Layout } from '../components/layout/Layout'
import type { UserRol } from '../types'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'

// Lazy load pages for better performance
const Dashboard = React.lazy(() => import('../pages/Dashboard'))
const Clientes = React.lazy(() => import('../pages/Clientes'))
const ClienteDetail = React.lazy(() => import('../pages/ClienteDetail'))
const Proveedores = React.lazy(() => import('../pages/Proveedores'))
const ProveedorDetail = React.lazy(() => import('../pages/ProveedorDetail'))
const Productos = React.lazy(() => import('../pages/Productos'))
const ProductoDetail = React.lazy(() => import('../pages/ProductoDetail'))
const Ventas = React.lazy(() => import('../pages/Ventas'))
const VentaDetail = React.lazy(() => import('../pages/VentaDetail'))
const Pagos = React.lazy(() => import('../pages/Pagos'))
const Compras = React.lazy(() => import('../pages/Compras'))
const CompraDetail = React.lazy(() => import('../pages/CompraDetail'))
const Caja = React.lazy(() => import('../pages/Caja'))
const Usuarios = React.lazy(() => import('../pages/Usuarios'))
const Configuracion = React.lazy(() => import('../pages/Configuracion'))
const ConfiguracionSuperAdmin = React.lazy(() => import('../pages/ConfiguracionSuperAdmin'))
const Chat = React.lazy(() => import('../pages/Chat'))
const Cobranzas = React.lazy(() => import('../pages/Cobranzas'))
const Login = React.lazy(() => import('../pages/Login'))
const Register = React.lazy(() => import('../pages/Register'))
const Unauthorized = React.lazy(() => import('../pages/Unauthorized'))

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: UserRol[]
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, profile, loading: authLoading } = useAuth()
  const location = useLocation()

  if (authLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <p className="text-body-md text-on-surface-variant animate-pulse">Iniciando sesión...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles) {
    if (!profile) return <Navigate to="/unauthorized" replace />
    // El superadmin siempre tiene acceso a todo
    if (profile.rol === 'superadmin') return <>{children}</>
    if (!allowedRoles.includes(profile.rol)) return <Navigate to="/unauthorized" replace />
  }

  return <>{children}</>
}

export const AppRouter: React.FC = () => {
  return (
    <React.Suspense fallback={<LoadingSpinner fullPage />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Protected Routes */}
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/clientes" element={
            <ProtectedRoute allowedRoles={['admin', 'vendedor']}>
              <Clientes />
            </ProtectedRoute>
          } />
          
          <Route path="/clientes/:id" element={
            <ProtectedRoute allowedRoles={['admin', 'vendedor']}>
              <ClienteDetail />
            </ProtectedRoute>
          } />

          <Route path="/cobranzas" element={
            <ProtectedRoute allowedRoles={['admin', 'vendedor']}>
              <Cobranzas />
            </ProtectedRoute>
          } />
          
          <Route path="/proveedores" element={
            <ProtectedRoute allowedRoles={['admin', 'vendedor']}>
              <Proveedores />
            </ProtectedRoute>
          } />
          <Route path="/proveedores/:id" element={
            <ProtectedRoute allowedRoles={['admin', 'vendedor']}>
              <ProveedorDetail />
            </ProtectedRoute>
          } />
          
          <Route path="/productos" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Productos />
            </ProtectedRoute>
          } />
          <Route path="/productos/:id" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <ProductoDetail />
            </ProtectedRoute>
          } />
          
          <Route path="/ventas" element={
            <ProtectedRoute allowedRoles={['admin', 'vendedor']}>
              <Ventas />
            </ProtectedRoute>
          } />
          
          <Route path="/ventas/:id" element={
            <ProtectedRoute allowedRoles={['admin', 'vendedor']}>
              <VentaDetail />
            </ProtectedRoute>
          } />
          
          <Route path="/pagos" element={
            <ProtectedRoute allowedRoles={['admin', 'cajero']}>
              <Pagos />
            </ProtectedRoute>
          } />
          
          <Route path="/compras" element={
            <ProtectedRoute allowedRoles={['admin', 'vendedor']}>
              <Compras />
            </ProtectedRoute>
          } />
          
          <Route path="/compras/:id" element={
            <ProtectedRoute allowedRoles={['admin', 'vendedor']}>
              <CompraDetail />
            </ProtectedRoute>
          } />
          
          <Route path="/caja" element={
            <ProtectedRoute allowedRoles={['admin', 'cajero']}>
              <Caja />
            </ProtectedRoute>
          } />
          
          <Route path="/usuarios" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Usuarios />
            </ProtectedRoute>
          } />
          
          <Route path="/configuracion" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Configuracion />
            </ProtectedRoute>
          } />
          
          <Route path="/chat" element={
            <ProtectedRoute>
              <Chat />
            </ProtectedRoute>
          } />
          
          <Route path="/superadmin" element={
            <ProtectedRoute allowedRoles={['superadmin']}>
              <ConfiguracionSuperAdmin />
            </ProtectedRoute>
          } />
          
          <Route path="/unauthorized" element={<Unauthorized />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </React.Suspense>
  )
}
