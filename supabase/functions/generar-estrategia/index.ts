import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const COSTO_CREDITOS = 800

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { local_id, periodo, objetivo, meta_valor } = await req.json()

    if (!local_id || !periodo || !objetivo) {
      throw new Error('local_id, periodo y objetivo son requeridos')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Obtener resumen de datos del negocio
    const { data: resumen, error: resumenError } = await supabase
      .rpc('resumen_para_estrategia', { p_local_id: local_id, p_periodo: periodo })
    if (resumenError) throw new Error('Error en resumen_para_estrategia: ' + resumenError.message)

    const periodoLabel: Record<string, string> = {
      semana: 'última semana (7 días)',
      mes: 'último mes (30 días)',
      trimestre: 'último trimestre (90 días)',
    }

    const objetivoLabel: Record<string, string> = {
      rentabilidad: `mejorar la rentabilidad${meta_valor ? ` un ${meta_valor}%` : ''}`,
      liquidar: 'liquidar productos con bajo movimiento de stock',
      volumen: `aumentar el volumen de ventas${meta_valor ? ` en $${Number(meta_valor).toLocaleString('es-AR')}` : ''}`,
    }

    const prompt = `Sos un consultor experto en estrategia comercial para pequeñas y medianas empresas argentinas.
Analizá los datos del siguiente negocio y generá un informe estratégico completo en formato JSON.

NEGOCIO: ${resumen.config_empresa?.nombre_app || resumen.config_empresa?.razon_social || 'Empresa'}
PERÍODO: ${periodoLabel[objetivo] || periodo}
OBJETIVO: ${objetivoLabel[objetivo] || objetivo}

TOTALES: ${JSON.stringify(resumen.totales)}
PRODUCTOS TOP: ${JSON.stringify(resumen.productos_top)}
MARGEN BAJO: ${JSON.stringify(resumen.margen_bajo)}
SIN MOVIMIENTO: ${JSON.stringify(resumen.sin_movimiento)}
STOCK BAJO: ${JSON.stringify(resumen.stock_bajo)}
VENTAS DIARIAS: ${JSON.stringify(resumen.ventas_diarias)}

Respondé SOLO con este JSON (sin markdown, sin texto extra, máx 4 items por sección):
{"resumen_ejecutivo":"string","indicadores_clave":[{"nombre":"string","valor":"string","tendencia":"positiva|negativa|neutral","comentario":"string"}],"productos_priorizar":[{"nombre":"string","precio_actual":0,"precio_sugerido":0,"razon":"string","accion":"mantener|subir_precio|promocionar|discontinuar"}],"objetivos_ventas":[{"producto":"string","cantidad_objetivo":0,"monto_objetivo":0,"plazo":"string"}],"promociones_sugeridas":[{"titulo":"string","descripcion":"string","productos_involucrados":["string"],"descuento_sugerido":"string","justificacion":"string"}],"acciones_inmediatas":[{"prioridad":1,"accion":"string","impacto_estimado":"string"}],"productos_discontinuar":[{"nombre":"string","stock_actual":0,"razon":"string","sugerencia":"string"}]}`

    // Llamar a Gemini
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${Deno.env.get('GEMINI_API_KEY')}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 32768 }
        })
      }
    )

    const geminiData = await geminiRes.json()
    if (!geminiRes.ok) throw new Error('Gemini error: ' + JSON.stringify(geminiData).slice(0, 300))

    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || ''
    if (!rawText) throw new Error('Gemini no generó respuesta. finishReason: ' + geminiData.candidates?.[0]?.finishReason)

    let informe: Record<string, unknown>
    try {
      const stripped = rawText.replace(/```json\s*/gi, '').replace(/```/g, '').trim()
      const match = stripped.match(/\{[\s\S]*\}/)
      informe = JSON.parse(match ? match[0] : stripped)
    } catch {
      throw new Error('JSON inválido de Gemini: ' + rawText.slice(0, 300))
    }

    // Descontar saldo (solo si Gemini respondió bien)
    const { error: saldoError } = await supabase.rpc('descontar_saldo', {
      monto_descuento: COSTO_CREDITOS,
      tipo_descuento: 'generar_estrategia',
      descripcion_descuento: `Informe estratégico ${periodo} — local ${local_id}`
    })
    if (saldoError) throw new Error('Error descontando saldo: ' + saldoError.message)

    // Guardar informe
    const { data: insertado, error: insertError } = await supabase
      .from('informes_estrategia')
      .insert({
        local_id,
        periodo,
        objetivo,
        meta_valor: meta_valor || null,
        informe,
        resumen_texto: informe.resumen_ejecutivo as string,
        costo_creditos: COSTO_CREDITOS,
      })
      .select()
      .single()

    if (insertError) throw new Error('Error guardando informe: ' + insertError.message)

    return new Response(
      JSON.stringify({ ok: true, informe: insertado }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
