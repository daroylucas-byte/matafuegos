import React, { useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

const loginSchema = z.object({
  email: z.string().email('Email inválido').min(1, 'El email es requerido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').min(1, 'La contraseña es requerida'),
})

type LoginFormValues = z.infer<typeof loginSchema>

const Login: React.FC = () => {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      navigate('/dashboard', { replace: true })
    }
  }, [user, authLoading, navigate])

  const onSubmit = async (data: LoginFormValues) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (error) {
        let message = 'Error al iniciar sesión. Intentá de nuevo.'
        
        if (error.message === 'Invalid login credentials') {
          message = 'Email o contraseña incorrectos'
        } else if (error.message === 'Email not confirmed') {
          message = 'Confirmá tu email antes de ingresar'
        }

        toast.error(message)
        return
      }

      toast.success('¡Bienvenido!')
      // No navegamos aquí. El useEffect de arriba se encargará 
      // de llevarnos al dashboard cuando useAuth detecte la sesión.
    } catch (error) {
      console.error('Login error:', error)
      toast.error('Error al iniciar sesión. Intentá de nuevo.')
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <p className="text-body-md text-on-surface-variant animate-pulse">Verificando sesión...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface-container-lowest p-8 rounded-2xl shadow-modal border border-outline-variant">
        <div className="text-center mb-8">
          <h1 className="text-headline-lg text-primary mb-2">GestApp</h1>
          <p className="text-body-md text-on-surface-variant">Iniciá sesión para continuar</p>
        </div>
        
        <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <Input 
            label="Email" 
            type="email" 
            placeholder="tu@email.com"
            {...register('email')}
            error={errors.email?.message}
          />
          <Input 
            label="Contraseña" 
            type="password" 
            placeholder="••••••••"
            {...register('password')}
            error={errors.password?.message}
          />
          
          <Button 
            className="w-full" 
            size="lg" 
            type="submit"
            isLoading={isSubmitting}
          >
            Ingresar
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-body-md text-on-surface-variant">
            ¿No tenés una cuenta?{' '}
            <Link to="/register" className="text-primary font-semibold hover:underline">
              Registrate
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login
