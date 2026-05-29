import fp from 'fastify-plugin'
import axios from 'axios'
import crypto from 'crypto'
import {
  getProductId, upsertAbacateProduct, getProductByExternalId,
  getUserById, setAbacateCustomer,
  activateSubscription, renewSubscription, cancelSubscription,
} from './db.js'

const API_BASE = 'https://api.abacatepay.com/v2'

const ABACATE_PRODUCTS = [
  { externalId: 'zpply-pro-mensal',         plan: 'pro',     billing: 'mensal',     price: 7900,   cycle: 'MONTHLY',   name: 'Zpply Pro Mensal',         trialDays: 7 },
  { externalId: 'zpply-pro-trimestral',     plan: 'pro',     billing: 'trimestral', price: 20700,  cycle: 'QUARTERLY', name: 'Zpply Pro Trimestral',     trialDays: 7 },
  { externalId: 'zpply-pro-anual',          plan: 'pro',     billing: 'anual',      price: 70800,  cycle: 'ANNUALLY',  name: 'Zpply Pro Anual',          trialDays: 7 },
  { externalId: 'zpply-premium-mensal',     plan: 'premium', billing: 'mensal',     price: 29900,  cycle: 'MONTHLY',   name: 'Zpply Premium Mensal',     trialDays: 7 },
  { externalId: 'zpply-premium-trimestral', plan: 'premium', billing: 'trimestral', price: 79200,  cycle: 'QUARTERLY', name: 'Zpply Premium Trimestral', trialDays: 7 },
  { externalId: 'zpply-premium-anual',      plan: 'premium', billing: 'anual',      price: 298800, cycle: 'ANNUALLY',  name: 'Zpply Premium Anual',      trialDays: 7 },
]

async function ensureProducts(apiKey, log) {
  const headers = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }

  for (const product of ABACATE_PRODUCTS) {
    const existing = await getProductId(product.plan, product.billing)
    if (existing) continue

    try {
      const { data: res } = await axios.post(
        `${API_BASE}/products/create`,
        {
          externalId: product.externalId,
          name:       product.name,
          price:      product.price,
          currency:   'BRL',
          cycle:      product.cycle,
          trialDays:  product.trialDays,
        },
        { headers },
      )

      if (res.success) {
        await upsertAbacateProduct({
          id:         res.data.id,
          externalId: product.externalId,
          plan:       product.plan,
          billing:    product.billing,
        })
        log.info(`AbacatePay: produto criado ${product.externalId} → ${res.data.id}`)
      }
    } catch (err) {
      log.error({ err: err.message, body: err.response?.data, product: product.externalId }, 'AbacatePay: erro ao criar produto')
    }
  }
}

export default fp(async function paymentsPlugin(fastify) {
  const apiKey       = process.env.ABACATEPAY_API_KEY
  const webhookSecret = process.env.ABACATEPAY_WEBHOOK_SECRET
  const baseUrl      = process.env.BASE_URL || 'http://localhost:3000'

  if (!apiKey) {
    fastify.log.warn('ABACATEPAY_API_KEY não configurada — pagamentos desativados')
    return
  }

  await ensureProducts(apiKey, fastify.log)

  const headers = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }

  // POST /subscribe — inicia checkout de assinatura
  fastify.post('/subscribe', { preHandler: [fastify.authenticate] }, async (req, reply) => {
    const { plan, billing } = req.body ?? {}

    if (!['pro', 'premium'].includes(plan) || !['mensal', 'trimestral', 'anual'].includes(billing)) {
      return reply.status(400).send({ error: 'Plano ou ciclo de cobrança inválido.' })
    }

    const productId = await getProductId(plan, billing)
    if (!productId) {
      return reply.status(503).send({ error: 'Produto indisponível. Tente novamente mais tarde.' })
    }

    const user = await getUserById(req.user.sub)
    if (!user) return reply.status(404).send({ error: 'Usuário não encontrado.' })

    // Cria customer no AbacatePay se ainda não existe
    let customerId = user.abacatepay_customer_id
    if (!customerId) {
      try {
        const { data: res } = await axios.post(
          `${API_BASE}/customers/create`,
          { email: user.email, name: user.name },
          { headers },
        )
        customerId = res.data.id
        await setAbacateCustomer(user.id, customerId)
      } catch (err) {
        fastify.log.error({ body: err.response?.data, status: err.response?.status }, 'AbacatePay: erro ao criar customer')
        throw err
      }
    }

    // Cria checkout de assinatura
    let subRes
    try {
      const { data } = await axios.post(
        `${API_BASE}/subscriptions/create`,
        {
          items:         [{ id: productId, quantity: 1 }],
          customerId,
          externalId:    user.id,
          completionUrl: `${baseUrl}/subscribe/success`,
          methods:       ['PIX', 'CARD'],
        },
        { headers },
      )
      subRes = data
    } catch (err) {
      fastify.log.error({ body: err.response?.data, status: err.response?.status }, 'AbacatePay: erro ao criar subscription')
      throw err
    }

    return reply.send({ url: subRes.data.url })
  })

  // POST /webhooks/abacatepay — recebe eventos de assinatura
  fastify.post('/webhooks/abacatepay', {
    config: { rawBody: true },
  }, async (req, reply) => {
    // TODO: reativar HMAC após entender formato exato do AbacatePay v2
    fastify.log.info({ sig: req.headers['x-webhook-signature'], rawBody: req.rawBody }, 'AbacatePay webhook headers')

    const { event, data } = req.body ?? {}
    fastify.log.info({ event }, 'AbacatePay webhook recebido')

    try {
      switch (event) {
        case 'subscription.completed': {
          const sub    = data?.subscription
          const userId = sub?.externalId
          const productExternalId = sub?.product?.externalId
          if (!userId || !productExternalId) break

          const product = await getProductByExternalId(productExternalId)
          if (!product) break

          await activateSubscription(userId, {
            subscriptionId: sub.id,
            plan:           product.plan,
            planBilling:    product.billing,
            renewsAt:       sub.nextBillingDate ?? null,
          })
          fastify.log.info({ userId, plan: product.plan }, 'Assinatura ativada')
          break
        }

        case 'subscription.renewed': {
          const sub    = data?.subscription
          const userId = sub?.externalId
          if (!userId) break
          await renewSubscription(userId, sub?.nextBillingDate ?? null)
          fastify.log.info({ userId }, 'Assinatura renovada')
          break
        }

        case 'subscription.cancelled': {
          const userId = data?.subscription?.externalId
          if (!userId) break
          await cancelSubscription(userId)
          fastify.log.info({ userId }, 'Assinatura cancelada')
          break
        }

        default:
          fastify.log.info({ event }, 'AbacatePay: evento ignorado')
      }
    } catch (err) {
      fastify.log.error({ err: err.message, event }, 'AbacatePay: erro ao processar webhook')
    }

    return reply.send({ ok: true })
  })
})
