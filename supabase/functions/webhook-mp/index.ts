import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const body = await req.json()

    // MP envía distintos tipos de notificación
    const tipo = body.type || body.topic
    const id = body.data?.id || body.id

    if (tipo !== 'payment' || !id) {
      return new Response('ok', { status: 200 })
    }

    const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')
    if (!accessToken) throw new Error('MERCADOPAGO_ACCESS_TOKEN no configurado')

    // Verificar el pago con la API de MP
    const res = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    })

    const pago = await res.json()

    if (!res.ok) {
      console.error('Error consultando pago MP:', pago)
      return new Response('error', { status: 200 }) // 200 para que MP no reintente
    }

    // Solo procesar pagos aprobados
    if (pago.status !== 'approved') {
      return new Response('ok', { status: 200 })
    }

    // Parsear external_reference: "local_id:monto:timestamp"
    const parts = (pago.external_reference || '').split(':')
    if (parts.length < 2) {
      console.error('external_reference inválido:', pago.external_reference)
      return new Response('ok', { status: 200 })
    }

    const local_id = parts[0]
    const monto = parseInt(parts[1], 10)

    if (!local_id || isNaN(monto)) {
      console.error('local_id o monto inválido:', parts)
      return new Response('ok', { status: 200 })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Evitar doble acreditación con el payment_id de MP
    const { data: yaAcreditado } = await supabase
      .from('transacciones_marketing')
      .select('id')
      .eq('mp_payment_id', String(id))
      .single()

    if (yaAcreditado) {
      return new Response('ok', { status: 200 })
    }

    // Acreditar saldo
    const { error } = await supabase.rpc('cargar_saldo', {
      monto_carga: monto,
      descripcion_carga: `Recarga MP — pago ${id} — local ${local_id}`
    })

    if (error) {
      console.error('Error acreditando saldo:', error)
      return new Response('error', { status: 200 })
    }

    // Guardar el mp_payment_id para evitar duplicados
    await supabase
      .from('transacciones_marketing')
      .update({ mp_payment_id: String(id) })
      .eq('descripcion', `Recarga MP — pago ${id} — local ${local_id}`)

    return new Response('ok', { status: 200 })

  } catch (err: any) {
    console.error('Webhook error:', err.message)
    return new Response('ok', { status: 200 }) // Siempre 200 para que MP no reintente
  }
})
