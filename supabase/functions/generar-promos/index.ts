import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { local_id, instruccion_extra, objetivo_negocio, publico_objetivo, canal_publicacion, tono_deseado } = await req.json()

    if (!local_id) throw new Error('local_id es requerido')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Obtener resumen del negocio
    const { data: resumen, error: resumenError } = await supabase.rpc('resumen_para_promo', { p_local_id: local_id })
    if (resumenError) throw new Error('Error en resumen_para_promo: ' + resumenError.message)

    // Construir prompt para Gemini
    const prompt = `Sos un experto en marketing para pequeñas y medianas empresas argentinas.
Generá exactamente 4 promociones diferentes y creativas para el siguiente negocio.

DATOS DEL NEGOCIO:
- Nombre: ${resumen.config_empresa?.nombre_app || resumen.config_empresa?.razon_social || 'Negocio'}
- Dirección: ${resumen.config_empresa?.direccion || ''}

PRODUCTOS MÁS VENDIDOS (últimos 30 días):
${JSON.stringify(resumen.productos_top, null, 2)}

PRODUCTOS CON STOCK BAJO (candidatos a promocionar para liquidar):
${JSON.stringify(resumen.stock_bajo, null, 2)}

VENTAS DE LOS ÚLTIMOS 7 DÍAS:
${JSON.stringify(resumen.ventas_recientes, null, 2)}

${resumen.identidad_visual?.instrucciones_ia ? `IDENTIDAD VISUAL Y TONO DE COMUNICACIÓN:\n${resumen.identidad_visual.instrucciones_ia}` : ''}
${instruccion_extra ? `\nINSTRUCCIÓN ESPECIAL DEL NEGOCIO:\n${instruccion_extra}` : ''}
${objetivo_negocio ? `\nOBJETIVO: ${objetivo_negocio}` : ''}
${publico_objetivo ? `\nPÚBLICO OBJETIVO: ${publico_objetivo}` : ''}
${canal_publicacion ? `\nCANAL: ${canal_publicacion}` : ''}
${tono_deseado ? `\nTONO DESEADO: ${tono_deseado}` : ''}

Respondé ÚNICAMENTE con un JSON array con exactamente 4 objetos. Cada objeto debe tener:
- "texto_promo": texto completo de la promoción lista para publicar en redes (máx 280 caracteres, con emojis, en español argentino)
- "razon": breve explicación interna de por qué esta promo tiene sentido para el negocio (no se publica)

Ejemplo de formato:
[
  {
    "texto_promo": "🔥 ¡Aprovechá esta semana! 2x1 en matafuegos ABC...",
    "razon": "El matafuegos ABC tiene stock bajo y alta demanda reciente"
  }
]

No agregues texto fuera del JSON. Solo el array JSON puro.`

    // Llamar a Gemini
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${Deno.env.get('GEMINI_API_KEY')}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 8192
          }
        })
      }
    )

    const geminiData = await geminiRes.json()

    // Log completo para debugging
    if (!geminiRes.ok) {
      throw new Error('Gemini API error: ' + JSON.stringify(geminiData).slice(0, 300))
    }

    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || ''

    if (!rawText) {
      const finishReason = geminiData.candidates?.[0]?.finishReason || 'unknown'
      throw new Error(`Gemini no generó texto. finishReason: ${finishReason}. Response: ${JSON.stringify(geminiData).slice(0, 300)}`)
    }

    // Parsear respuesta JSON
    let promos: { texto_promo: string; razon: string }[] = []
    try {
      const match = rawText.match(/\[[\s\S]*\]/)
      promos = JSON.parse(match ? match[0] : rawText)
    } catch {
      throw new Error('JSON inválido de Gemini: ' + rawText.slice(0, 300))
    }

    if (!Array.isArray(promos) || promos.length === 0) {
      throw new Error('Array vacío de Gemini: ' + rawText.slice(0, 200))
    }

    // Descontar saldo solo si Gemini respondió correctamente
    const { error: saldoError } = await supabase.rpc('descontar_saldo', {
      monto_descuento: 600,
      tipo_descuento: 'generar_promos',
      descripcion_descuento: `Generación de promociones para local ${local_id}`
    })
    if (saldoError) throw new Error('Error descontando saldo: ' + saldoError.message)

    // Guardar en BD
    const rows = promos.map((p) => ({
      local_id,
      texto_promo: p.texto_promo,
      estado: 'pendiente',
      fecha: new Date().toISOString().split('T')[0],
    }))

    const { data: inserted, error: insertError } = await supabase
      .from('promociones')
      .insert(rows)
      .select()

    if (insertError) throw new Error('Error guardando promos: ' + insertError.message)

    return new Response(
      JSON.stringify({ ok: true, promociones: inserted }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
