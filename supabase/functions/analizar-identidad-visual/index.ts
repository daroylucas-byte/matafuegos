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

    const { error: saldoError } = await supabase.rpc('descontar_saldo', {
      monto_descuento: 500,
      tipo_descuento: 'analizar_identidad',
      descripcion_descuento: `Análisis de identidad visual para local ${local_id}`
    })
    if (saldoError) throw new Error(saldoError.message)

    const imageParts = imagenes_base64.map((img: { data: string; mimeType: string }) => ({
      inlineData: { data: img.data, mimeType: img.mimeType || 'image/jpeg' }
    }))

    const textPart = {
      text: `Sos un director de arte experto en publicidad gráfica. Analizá estas imágenes de marca y respondé SOLO con un JSON válido y completo. Es crítico que el JSON cierre correctamente con }}. Máximo 200 palabras por campo.

Formato exacto:
{
  "colores_predominantes": "colores con HEX y uso (ej: verde #228B22 fondo, blanco texto, naranja #E87722 acento)",
  "tipografia_percibida": "estilo tipográfico y jerarquía (ej: titular ultra-bold mayúsculas, subtítulo bold, cuerpo regular)",
  "estilo_general": "estilo compositivo en una frase (ej: foto realista de producto con overlays de texto bold sobre fondo oscuro dividido en zonas)",
  "tipo_imagen_producto": "FOTOGRAFIA_REAL o ILUSTRACION",
  "palabras_clave_visuales": "elementos que deben aparecer siempre, separados por comas (ej: marco blanco, iconos fila, logo esquina inferior, URL al pie)",
  "instrucciones_para_ia": "1.FONDO: [cómo dividir zonas y colores]. 2.PRODUCTO: [posición y si es foto o ilustración]. 3.TEXTO: [jerarquía y posición, siempre perfectamente escrito sin errores ortográficos ni letras duplicadas]. 4.DECORACION: [iconos y formas]. 5.MARCA: [logo y URL]. 6.PROHIBIDO: [qué no hacer]."
}

NO agregues texto fuera del JSON. El JSON debe estar completo y cerrado.`
    }

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${Deno.env.get('GEMINI_API_KEY')}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [...imageParts, textPart] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 4096 }
        })
      }
    )

    const geminiData = await geminiRes.json()
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || ''

    let analisis: Record<string, string> = {}
    try {
      const stripped = rawText.replace(/```json\s*/gi, '').replace(/```/g, '').trim()
      const match = stripped.match(/\{[\s\S]*\}/)
      analisis = JSON.parse(match ? match[0] : stripped)
    } catch {
      throw new Error('Gemini no devolvió un JSON válido: ' + rawText.slice(0, 200))
    }

    const { error: upsertError } = await supabase
      .from('identidad_visual')
      .upsert({
        local_id,
        colores_predominantes:   analisis.colores_predominantes || '',
        tipografia_percibida:    analisis.tipografia_percibida || '',
        estilo_general:          analisis.estilo_general || '',
        palabras_clave_visuales: analisis.palabras_clave_visuales || '',
        instrucciones_para_ia:   analisis.instrucciones_para_ia || '',
        tipo_imagen_producto:    analisis.tipo_imagen_producto || 'FOTOGRAFIA_REAL',
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
