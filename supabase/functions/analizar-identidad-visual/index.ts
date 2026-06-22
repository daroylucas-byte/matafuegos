import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { local_id, imagenes_base64 } = await req.json()

    if (!local_id) throw new Error('local_id es requerido')
    if (!imagenes_base64 || !Array.isArray(imagenes_base64) || imagenes_base64.length === 0) {
      throw new Error('Se requiere al menos una imagen en base64')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Descontar saldo
    const { error: saldoError } = await supabase.rpc('descontar_saldo', {
      monto_descuento: 500,
      tipo_descuento: 'analizar_identidad',
      descripcion_descuento: `Análisis de identidad visual para local ${local_id}`
    })
    if (saldoError) throw new Error(saldoError.message)

    // Construir partes del prompt con las imágenes
    const imageParts = imagenes_base64.map((img: { data: string; mimeType: string }) => ({
      inlineData: { data: img.data, mimeType: img.mimeType || 'image/jpeg' }
    }))

    const textPart = {
      text: `Analizá estas imágenes de la identidad visual de una empresa argentina y devolvé un JSON con exactamente estas claves:

{
  "colores_predominantes": "descripción de los colores principales (ej: azul marino, blanco, dorado)",
  "tipografia_percibida": "descripción del estilo tipográfico (ej: sans-serif moderna, bold, minimalista)",
  "estilo_general": "descripción del estilo general (ej: profesional y serio, moderno y dinámico, tradicional)",
  "palabras_clave_visuales": "elementos visuales característicos separados por comas (ej: llamas, escudos, líneas geométricas)",
  "instrucciones_para_ia": "instrucciones detalladas en primera persona sobre cómo generar contenido visual y textual que respete esta identidad de marca (máx 200 palabras)"
}

Respondé ÚNICAMENTE con el JSON, sin texto adicional.`
    }

    // Llamar a Gemini con visión
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${Deno.env.get('GEMINI_API_KEY')}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [...imageParts, textPart] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 8192 }
        })
      }
    )

    const geminiData = await geminiRes.json()
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || ''

    // Parsear JSON de respuesta
    let analisis: Record<string, string> = {}
    try {
      // Saca bloques ```json ... ``` si los hay
      const stripped = rawText.replace(/```json\s*/gi, '').replace(/```/g, '').trim()
      const match = stripped.match(/\{[\s\S]*\}/)
      analisis = JSON.parse(match ? match[0] : stripped)
    } catch {
      throw new Error('Gemini no devolvió un JSON válido: ' + rawText.slice(0, 200))
    }

    // Guardar o actualizar en BD
    const { error: upsertError } = await supabase
      .from('identidad_visual')
      .upsert({
        local_id,
        colores_predominantes:   analisis.colores_predominantes || '',
        tipografia_percibida:    analisis.tipografia_percibida || '',
        estilo_general:          analisis.estilo_general || '',
        palabras_clave_visuales: analisis.palabras_clave_visuales || '',
        instrucciones_para_ia:   analisis.instrucciones_para_ia || '',
        actualizado_at:          new Date().toISOString()
      }, { onConflict: 'local_id' })

    if (upsertError) throw new Error(upsertError.message)

    return new Response(
      JSON.stringify({ ok: true, analisis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
