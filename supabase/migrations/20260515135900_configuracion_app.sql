-- Crear tabla de configuración
CREATE TABLE IF NOT EXISTS public.configuracion (
    id integer PRIMARY KEY CHECK (id = 1),
    nombre_app text DEFAULT 'Gestión Pro' NOT NULL,
    color_primario text DEFAULT '#3525cd' NOT NULL,
    color_secundario text DEFAULT '#006c49' NOT NULL,
    logo_url text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Insertar valores iniciales
INSERT INTO public.configuracion (id, nombre_app, color_primario, color_secundario)
VALUES (1, 'Gestión Pro', '#3525cd', '#006c49')
ON CONFLICT (id) DO NOTHING;

-- Habilitar RLS
ALTER TABLE public.configuracion ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
CREATE POLICY "Lectura pública de configuración"
ON public.configuracion FOR SELECT
USING (true);

CREATE POLICY "Solo admin puede editar configuración"
ON public.configuracion FOR UPDATE
USING (public.mi_rol() = 'admin'::user_rol);

-- Trigger para updated_at
CREATE TRIGGER trg_configuracion_updated_at 
BEFORE UPDATE ON public.configuracion 
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Crear bucket para logos si no existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas para el bucket de logos
CREATE POLICY "Logos son públicos"
ON storage.objects FOR SELECT
USING (bucket_id = 'logos');

CREATE POLICY "Solo admin puede subir logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'logos' AND 
  (SELECT public.mi_rol() = 'admin'::user_rol)
);

CREATE POLICY "Solo admin puede borrar logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'logos' AND 
  (SELECT public.mi_rol() = 'admin'::user_rol)
);
