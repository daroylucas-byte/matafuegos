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

const registerSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').min(1, 'El nombre es requerido'),
  email: z.string().email('Email inválido').min(1, 'El email es requerido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').min(1, 'La contraseña es requerida'),
  confirmPassword: z.string().min(1, 'Confirmar la contraseña es requerido'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
})

type RegisterFormValues = z.infer<typeof registerSchema>

const Register: React.FC = () => {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      nombre: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  })

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      navigate('/dashboard', { replace: true })
    }
  }, [user, authLoading, navigate])

  const onSubmit = async (data: RegisterFormValues) => {
    try {
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            nombre: data.nombre,
          },
        },
      })

      if (error) {
        toast.error(error.message === 'User already registered' 
          ? 'Este email ya está registrado' 
          : 'Error al crear la cuenta. Intentá de nuevo.')
        return
      }

      toast.success('¡Cuenta creada! Revisá tu email para confirmar.')
      navigate('/login')
    } catch (error) {
      console.error('Register error:', error)
      toast.error('Error al crear la cuenta. Intentá de nuevo.')
    }
  }

  if (authLoading) {
    return null
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface-container-lowest p-8 rounded-2xl shadow-modal border border-outline-variant">
        <div className="text-center mb-8">
          <h1 className="text-headline-lg text-primary mb-2">Crear Cuenta</h1>
          <p className="text-body-md text-on-surface-variant">Unite a GestApp para gestionar tu negocio</p>
        </div>
        
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <Input 
            label="Nombre Completo" 
            placeholder="Juan Pérez"
            {...register('nombre')}
            error={errors.nombre?.message}
          />
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
          <Input 
            label="Confirmar Contraseña" 
            type="password" 
            placeholder="••••••••"
            {...register('confirmPassword')}
            error={errors.confirmPassword?.message}
          />
          
          <Button 
            className="w-full mt-6" 
            size="lg" 
            type="submit"
            isLoading={isSubmitting}
          >
            Registrarse
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-body-md text-on-surface-variant">
            ¿Ya tenés una cuenta?{' '}
            <Link to="/login" className="text-primary font-semibold hover:underline">
              Iniciá sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Register
