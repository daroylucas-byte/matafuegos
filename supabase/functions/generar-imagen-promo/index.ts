import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { promo_id, local_id } = await req.json()

    if (!promo_id || !local_id) throw new Error('promo_id y local_id son requeridos')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Obtener la promo
    const { data: promo, error: promoError } = await supabase
      .from('promociones')
      .select('*')
      .eq('id', promo_id)
      .single()

    if (promoError || !promo) throw new Error('Promoción no encontrada')

    // Obtener identidad visual del local
    const { data: identidad } = await supabase
      .from('identidad_visual')
      .select('*')
      .eq('local_id', local_id)
      .single()

    // Obtener config empresa
    const { data: config } = await supabase
      .from('configuracion')
      .select('nombre_app, razon_social, color_primario')
      .eq('id', 1)
      .single()

    // Prompt para imagen
    const prompt = `Imagen publicitaria profesional para redes sociales, formato cuadrado 1:1, estilo moderno y atractivo.
Negocio: ${config?.nombre_app || config?.razon_social || 'Empresa argentina'}
Promoción: "${promo.texto_promo}"
${identidad?.estilo_general ? `Estilo visual: ${identidad.estilo_general}` : ''}
${identidad?.colores_predominantes ? `Colores predominantes: ${identidad.colores_predominantes}` : `Color principal: ${config?.color_primario || '#3525cd'}`}
${identidad?.palabras_clave_visuales ? `Elementos visuales: ${identidad.palabras_clave_visuales}` : ''}
La imagen debe incluir el texto de la promoción de forma legible. Diseño apto para Instagram y WhatsApp.`

    // Llamar a Gemini 2.5 Flash Image (soporta output de imagen nativo)
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${Deno.env.get('GEMINI_API_KEY')}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            responseModalities: ['IMAGE', 'TEXT'],
            temperature: 1
          }
        })
      }
    )

    const geminiData = await geminiRes.json()

    if (!geminiRes.ok) {
      throw new Error('Imagen API error: ' + JSON.stringify(geminiData).slice(0, 300))
    }

    const parts = geminiData.candidates?.[0]?.content?.parts || []
    const imagePart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'))
    const b64 = imagePart?.inlineData?.data
    const mimeType = imagePart?.inlineData?.mimeType || 'image/png'

    if (!b64) {
      const finishReason = geminiData.candidates?.[0]?.finishReason || 'unknown'
      throw new Error(`No se generó imagen. finishReason: ${finishReason}. Response: ${JSON.stringify(geminiData).slice(0, 300)}`)
    }

    // Descontar saldo solo si la imagen se generó correctamente
    const { error: saldoError } = await supabase.rpc('descontar_saldo', {
      monto_descuento: 1250,
      tipo_descuento: 'generar_imagen',
      descripcion_descuento: `Imagen para promo ID ${promo_id}`
    })
    if (saldoError) throw new Error('Error descontando saldo: ' + saldoError.message)

    // Subir imagen a Supabase Storage
    const imageBuffer = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
    const ext = mimeType.split('/')[1] || 'png'
    const fileName = `promos/${local_id}/${promo_id}-${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('marketing')
      .upload(fileName, imageBuffer, { contentType: mimeType, upsert: true })

    if (uploadError) throw new Error('Error subiendo imagen: ' + uploadError.message)

    const { data: { publicUrl } } = supabase.storage
      .from('marketing')
      .getPublicUrl(fileName)

    // Actualizar promo con la URL de la imagen
    const { error: updateError } = await supabase
      .from('promociones')
      .update({ imagen_url: publicUrl, updated_at: new Date().toISOString() })
      .eq('id', promo_id)

    if (updateError) throw new Error(updateError.message)

    return new Response(
      JSON.stringify({ ok: true, imagen_url: publicUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
