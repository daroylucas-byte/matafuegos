import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type TipoImagen = 'simple' | 'pack' | 'carrusel'

const COSTOS: Record<TipoImagen, number> = {
  simple: 1250,
  pack: 3000,
  carrusel: 5000,
}

function buildIdentidadStr(identidad: any, colorPrimario: string): string {
  return [
    identidad?.estilo_general ? `Estilo visual: ${identidad.estilo_general}` : '',
    identidad?.colores_predominantes ? `Colores: ${identidad.colores_predominantes}` : `Color principal: ${colorPrimario}`,
    identidad?.palabras_clave_visuales ? `Elementos visuales obligatorios: ${identidad.palabras_clave_visuales}` : '',
    identidad?.tipografia_percibida ? `Tipografía: ${identidad.tipografia_percibida}` : '',
  ].filter(Boolean).join('\n')
}

function buildTipoProductoStr(identidad: any): string {
  const tipo = identidad?.tipo_imagen_producto || 'FOTOGRAFIA_REAL'
  if (tipo === 'FOTOGRAFIA_REAL') {
    return 'IMPORTANTE: El producto debe aparecer como fotografía hiperrealista o render 3D fotorrealista, NO como ilustración ni vector. Estilo foto de producto profesional.'
  }
  return 'El producto puede representarse como ilustración o vector, manteniendo el estilo gráfico de la marca.'
}

function buildTextoStr(): string {
  return 'CRÍTICO — TEXTO EN LA IMAGEN: Cada palabra debe estar perfectamente escrita. Prestá atención especial a: palabras con Ñ (ej: AÑO, MAÑANA), palabras con tildes (ej: OFERTA, PRÓXIMO), números exactos. NO duplicar letras. NO inventar palabras. Copiá el texto exactamente como aparece en la promoción.'
}

function buildPromptSimple(nombre: string, textoPromo: string, identidadStr: string, tipoProducto: string, textoStr: string) {
  return `Imagen publicitaria profesional para WhatsApp e Instagram, composición CUADRADA 1:1.
Negocio: ${nombre}
Promoción: "${textoPromo}"
${identidadStr}
${tipoProducto}
${textoStr}
Margen interno mínimo 80px en todos los bordes. Diseño moderno y atractivo, apto para móvil.`
}

function buildPromptFeedVertical(nombre: string, textoPromo: string, identidadStr: string, tipoProducto: string, textoStr: string) {
  return `Imagen publicitaria profesional para feed de Instagram, composición VERTICAL 4:5 (más alta que ancha).
Negocio: ${nombre}
Promoción: "${textoPromo}"
${identidadStr}
${tipoProducto}
${textoStr}
El diseño debe ocupar todo el espacio vertical. Texto grande y legible desde móvil. Margen interno mínimo 80px en todos los bordes.`
}

function buildPromptStory(nombre: string, textoPromo: string, identidadStr: string, tipoProducto: string, textoStr: string) {
  return `Imagen publicitaria profesional para Instagram Stories y Reels, composición VERTICAL PANTALLA COMPLETA 9:16.
Negocio: ${nombre}
Promoción: "${textoPromo}"
${identidadStr}
${tipoProducto}
${textoStr}
CRÍTICO DE COMPOSICIÓN: Todo el texto y el producto principal deben estar en la zona CENTRAL de la imagen (entre el 30% y el 65% de la altura total). El 14% superior e inferior queda cubierto por la UI de Instagram.`
}

function buildPromptCarrusel(nombre: string, itemTexto: string, identidadStr: string, tipoProducto: string, textoStr: string, n: number, total: number) {
  return `Tarjeta ${n} de ${total} para carrusel de Instagram, composición CUADRADA 1:1.
Negocio: ${nombre}
Producto/oferta de esta tarjeta: "${itemTexto}"
${identidadStr}
${tipoProducto}
${textoStr}
Estilo consistente con las demás tarjetas. Cada tarjeta funciona de forma independiente. Indicador ${n}/${total} en esquina inferior.`
}

async function generarImagenGemini(prompt: string, apiKey: string): Promise<{ b64: string; mimeType: string }> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ['IMAGE', 'TEXT'], temperature: 1 },
      }),
    }
  )
  const data = await res.json()
  if (!res.ok) throw new Error('Gemini API error: ' + JSON.stringify(data).slice(0, 300))
  const parts = data.candidates?.[0]?.content?.parts || []
  const imagePart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'))
  if (!imagePart) {
    const reason = data.candidates?.[0]?.finishReason || 'unknown'
    throw new Error(`No se generó imagen. finishReason: ${reason}`)
  }
  return { b64: imagePart.inlineData.data, mimeType: imagePart.inlineData.mimeType }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { promo_id, local_id, tipo = 'simple' } = await req.json() as { promo_id: number; local_id: string; tipo?: TipoImagen }

    if (!promo_id || !local_id) throw new Error('promo_id y local_id son requeridos')
    if (!['simple', 'pack', 'carrusel'].includes(tipo)) throw new Error('tipo debe ser simple, pack o carrusel')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    const apiKey = Deno.env.get('GEMINI_API_KEY')!

    const { data: promo, error: promoError } = await supabase
      .from('promociones')
      .select('*')
      .eq('id', promo_id)
      .single()
    if (promoError || !promo) throw new Error('Promoción no encontrada')

    const { data: identidad } = await supabase
      .from('identidad_visual')
      .select('*')
      .eq('local_id', local_id)
      .single()

    const { data: config } = await supabase
      .from('configuracion')
      .select('nombre_app, razon_social, color_primario')
      .eq('id', 1)
      .single()

    const nombre = config?.nombre_app || config?.razon_social || 'Empresa argentina'
    const identidadStr = buildIdentidadStr(identidad, config?.color_primario || '#3525cd')
    const tipoProducto = buildTipoProductoStr(identidad)
    const textoStr = buildTextoStr()
    const costo = COSTOS[tipo]

    async function subirImagen(b64: string, mimeType: string, sufijo: string): Promise<string> {
      const ext = mimeType.split('/')[1] || 'png'
      const fileName = `promos/${local_id}/${promo_id}-${sufijo}-${Date.now()}.${ext}`
      const buffer = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
      const { error } = await supabase.storage.from('marketing').upload(fileName, buffer, { contentType: mimeType, upsert: true })
      if (error) throw new Error('Error subiendo imagen: ' + error.message)
      const { data: { publicUrl } } = supabase.storage.from('marketing').getPublicUrl(fileName)
      return publicUrl
    }

    if (tipo === 'simple') {
      const prompt = buildPromptSimple(nombre, promo.texto_promo, identidadStr, tipoProducto, textoStr)
      const { b64, mimeType } = await generarImagenGemini(prompt, apiKey)

      const { error: saldoError } = await supabase.rpc('descontar_saldo', {
        monto_descuento: costo,
        tipo_descuento: 'generar_imagen',
        descripcion_descuento: `Imagen simple para promo ID ${promo_id}`,
      })
      if (saldoError) throw new Error('Error descontando saldo: ' + saldoError.message)

      const url = await subirImagen(b64, mimeType, 'simple')
      await supabase.from('promociones').update({ imagen_url: url, updated_at: new Date().toISOString() }).eq('id', promo_id)

      return new Response(JSON.stringify({ ok: true, tipo: 'simple', imagen_url: url }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (tipo === 'pack') {
      const [cuadrado, vertical, story] = await Promise.all([
        generarImagenGemini(buildPromptSimple(nombre, promo.texto_promo, identidadStr, tipoProducto, textoStr), apiKey),
        generarImagenGemini(buildPromptFeedVertical(nombre, promo.texto_promo, identidadStr, tipoProducto, textoStr), apiKey),
        generarImagenGemini(buildPromptStory(nombre, promo.texto_promo, identidadStr, tipoProducto, textoStr), apiKey),
      ])

      const { error: saldoError } = await supabase.rpc('descontar_saldo', {
        monto_descuento: costo,
        tipo_descuento: 'generar_imagen',
        descripcion_descuento: `Pack Meta (3 formatos) para promo ID ${promo_id}`,
      })
      if (saldoError) throw new Error('Error descontando saldo: ' + saldoError.message)

      const [urlCuadrado, urlVertical, urlStory] = await Promise.all([
        subirImagen(cuadrado.b64, cuadrado.mimeType, 'feed-cuadrado'),
        subirImagen(vertical.b64, vertical.mimeType, 'feed-vertical'),
        subirImagen(story.b64, story.mimeType, 'story'),
      ])

      const imagenesMeta = {
        tipo: 'pack',
        imagenes: [
          { formato: 'feed_cuadrado', dimension: '1080x1080', url: urlCuadrado },
          { formato: 'feed_vertical', dimension: '1080x1350', url: urlVertical },
          { formato: 'story', dimension: '1080x1920', url: urlStory },
        ],
      }

      await supabase.from('promociones').update({
        imagen_url: urlCuadrado,
        imagenes_meta: imagenesMeta,
        updated_at: new Date().toISOString(),
      }).eq('id', promo_id)

      return new Response(JSON.stringify({ ok: true, tipo: 'pack', imagenes_meta: imagenesMeta }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (tipo === 'carrusel') {
      const items = promo.texto_promo
        .split(/[.\n]+/)
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 10)
        .slice(0, 5)

      const tarjetas = items.length >= 2 ? items : Array(5).fill(promo.texto_promo)
      const total = tarjetas.length

      const imagenes = await Promise.all(
        tarjetas.map((item: string, i: number) =>
          generarImagenGemini(buildPromptCarrusel(nombre, item, identidadStr, tipoProducto, textoStr, i + 1, total), apiKey)
        )
      )

      const { error: saldoError } = await supabase.rpc('descontar_saldo', {
        monto_descuento: costo,
        tipo_descuento: 'generar_imagen',
        descripcion_descuento: `Carrusel (${total} tarjetas) para promo ID ${promo_id}`,
      })
      if (saldoError) throw new Error('Error descontando saldo: ' + saldoError.message)

      const urls = await Promise.all(
        imagenes.map((img, i) => subirImagen(img.b64, img.mimeType, `carrusel-${i + 1}`))
      )

      const imagenesMeta = {
        tipo: 'carrusel',
        imagenes: urls.map((url, i) => ({
          formato: `tarjeta_${i + 1}`,
          dimension: '1080x1080',
          url,
        })),
      }

      await supabase.from('promociones').update({
        imagen_url: urls[0],
        imagenes_meta: imagenesMeta,
        updated_at: new Date().toISOString(),
      }).eq('id', promo_id)

      return new Response(JSON.stringify({ ok: true, tipo: 'carrusel', imagenes_meta: imagenesMeta }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    throw new Error('tipo no reconocido')

  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
