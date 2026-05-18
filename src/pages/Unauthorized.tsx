import React from 'react'
import { Link } from 'react-router-dom'
import { ShieldAlert, LogOut } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { useAuth } from '../hooks/useAuth'

const Unauthorized: React.FC = () => {
  const { signOut } = useAuth()

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="p-4 bg-error-container/20 rounded-full mb-6">
        <ShieldAlert className="h-16 w-16 text-error" />
      </div>
      <h1 className="text-headline-lg text-on-surface mb-4">Sin Permisos</h1>
      <p className="text-body-lg text-on-surface-variant max-w-md mb-8">
        No tenés los permisos necesarios para acceder a este módulo.
        Contactá al administrador si creés que esto es un error.
      </p>
      <div className="flex gap-3">
        <Link to="/dashboard">
          <Button size="lg">Volver al Dashboard</Button>
        </Link>
        <Button size="lg" variant="ghost" onClick={signOut} className="gap-2">
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </Button>
      </div>
    </div>
  )
}

export default Unauthorized
