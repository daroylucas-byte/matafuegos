import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MONTOS_PERMITIDOS = [100, 5000, 10000, 20000, 50000]

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { monto, local_id } = await req.json()

    if (!monto || !local_id) throw new Error('monto y local_id son requeridos')
    if (!MONTOS_PERMITIDOS.includes(monto)) {
      throw new Error(`Monto no permitido. Opciones: ${MONTOS_PERMITIDOS.join(', ')}`)
    }

    const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')
    if (!accessToken) throw new Error('MERCADOPAGO_ACCESS_TOKEN no configurado')

    const preferencia = {
      items: [{
        title: `Recarga de saldo marketing — ${monto.toLocaleString('es-AR')} créditos`,
        quantity: 1,
        unit_price: monto,
        currency_id: 'ARS',
      }],
      external_reference: `${local_id}:${monto}:${Date.now()}`,
      back_urls: {
        success: `${Deno.env.get('FRONTEND_URL') || 'https://matafuegos.vercel.app'}/promociones?pago=exitoso`,
        failure: `${Deno.env.get('FRONTEND_URL') || 'https://matafuegos.vercel.app'}/promociones?pago=fallido`,
        pending: `${Deno.env.get('FRONTEND_URL') || 'https://matafuegos.vercel.app'}/promociones?pago=pendiente`,
      },
      auto_return: 'approved',
      notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/webhook-mp`,
      statement_descriptor: 'MATAFUEGOS MARKETING',
      expires: false,
    }

    const res = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preferencia),
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error('MP error: ' + JSON.stringify(data).slice(0, 300))
    }

    return new Response(
      JSON.stringify({ ok: true, init_point: data.init_point, preference_id: data.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
