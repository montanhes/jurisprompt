import Fastify from 'fastify'
import multipart from '@fastify/multipart'
import staticPlugin from '@fastify/static'
import cors from '@fastify/cors'
import IORedis from 'ioredis'
import { createWriteStream, createReadStream, unlink } from 'fs'
import { mkdir, stat } from 'fs/promises'
import { pipeline } from 'stream/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'
import { pdfQueue } from './queue.js'
import {
  initDb, addJob, loadJobs, getJobOwner, deleteJob,
  getUserById, incrementPdfCount, resetPdfCount,
} from './db.js'
import authPlugin from './auth.js'
import paymentsPlugin from './payments.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const redisSub = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379')
const sseClients = new Map() // channel → Set<res>

redisSub.on('message', (channel, _msg) => {
  const clients = sseClients.get(channel)
  if (!clients?.size) return
  const userId = channel.slice('jobs:'.length)
  loadJobs(userId).then(jobs => {
    const payload = `data: ${JSON.stringify(jobs)}\n\n`
    for (const res of clients) res.write(payload)
  }).catch(() => {})
})

const UPLOADS_DIR = process.env.UPLOADS_DIR || '/app/uploads'
const RESULTS_DIR = process.env.RESULTS_DIR || '/app/results'

const PLAN_LIMITS = {
  free:    { pdfs: 5,    mb: 10  },
  pro:     { pdfs: 100,  mb: 50  },
  premium: { pdfs: null, mb: 100 },
}

// Prefixos de rotas de API — nunca servem index.html
const API_PREFIXES = ['/auth', '/upload', '/jobs', '/results', '/webhooks', '/sitemap.xml', '/robots.txt']

await mkdir(UPLOADS_DIR, { recursive: true })
await mkdir(RESULTS_DIR, { recursive: true })
await initDb()

const app = Fastify({ logger: { level: 'info' } })

// Preserva raw body para verificação de HMAC no webhook do AbacatePay
app.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
  req.rawBody = body
  try { done(null, JSON.parse(body)) } catch (err) { done(err) }
})

await app.register(cors)
await app.register(authPlugin)
await app.register(paymentsPlugin)

await app.register(multipart, {
  limits: { fileSize: 500 * 1024 * 1024, files: 1 },
})

await app.register(staticPlugin, {
  root: path.join(__dirname, 'public'),
  prefix: '/',
})

// SPA fallback: rotas frontend desconhecidas servem index.html
app.setNotFoundHandler((req, reply) => {
  const isApi = req.method !== 'GET' ||
    API_PREFIXES.some(p => req.url === p || req.url.startsWith(`${p}/`) || req.url.startsWith(`${p}?`))
  if (isApi) return reply.status(404).send({ error: 'Não encontrado.' })
  return reply.sendFile('index.html')
})

app.get('/robots.txt', (_, reply) => {
  reply.type('text/plain').send(
    'User-agent: *\nAllow: /\nDisallow: /jobs\nDisallow: /upload\nDisallow: /results\nSitemap: https://zpply.com/sitemap.xml\n'
  )
})

app.get('/sitemap.xml', (_, reply) => {
  const BASE = process.env.BASE_URL || 'https://zpply.com'
  reply.type('application/xml').send(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${BASE}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>\n</urlset>\n`
  )
})

app.post('/upload', { preHandler: [app.authenticate] }, async (req, reply) => {
  // Verifica limites do plano antes de aceitar o arquivo
  const user   = await getUserById(req.user.sub)
  const limits = PLAN_LIMITS[user?.plan] ?? PLAN_LIMITS.free

  // Reseta contador mensal se expirou
  if (!user.monthly_pdf_reset_at || new Date() >= new Date(user.monthly_pdf_reset_at)) {
    await resetPdfCount(req.user.sub)
    user.monthly_pdf_count = 0
  }

  if (limits.pdfs !== null && user.monthly_pdf_count >= limits.pdfs) {
    return reply.status(429).send({
      error: `Limite de ${limits.pdfs} PDFs por mês atingido para o plano ${user.plan}.`,
    })
  }

  const id       = uuidv4()
  const filePath = path.join(UPLOADS_DIR, `${id}.pdf`)
  let originalName = null
  let pageStart    = null
  let pageEnd      = null
  let converter    = null

  try {
    for await (const part of req.parts()) {
      if (part.type === 'file') {
        if (!part.filename.toLowerCase().endsWith('.pdf')) {
          part.file.resume()
          return reply.status(400).send({ error: 'Apenas arquivos .pdf são aceitos.' })
        }
        originalName = part.filename
        await pipeline(part.file, createWriteStream(filePath))
      } else {
        if (part.fieldname === 'pageStart')  pageStart  = parseInt(part.value) || null
        if (part.fieldname === 'pageEnd')    pageEnd    = parseInt(part.value) || null
        if (part.fieldname === 'converter')  converter  = part.value
      }
    }
  } catch (err) {
    app.log.error(err, 'Erro ao processar upload')
    return reply.status(400).send({ error: 'Requisição inválida.' })
  }

  if (!originalName) return reply.status(400).send({ error: 'Nenhum arquivo enviado.' })

  if (!converter || !['docling', 'pymupdf'].includes(converter)) {
    unlink(filePath, () => {})
    return reply.status(400).send({ error: 'Selecione o motor de conversão: docling ou pymupdf.' })
  }

  // Verifica tamanho do arquivo contra limite do plano
  const { size } = await stat(filePath)
  const sizeMb   = size / (1024 * 1024)
  if (sizeMb > limits.mb) {
    unlink(filePath, () => {})
    return reply.status(413).send({
      error: `Arquivo excede o limite de ${limits.mb} MB do plano ${user.plan}.`,
    })
  }

  await addJob({ id, userId: req.user.sub, originalName, converter })
  await pdfQueue.add('process-pdf', { id, userId: req.user.sub, filePath, originalName, pageStart, pageEnd, converter }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 10000 },
  })
  await incrementPdfCount(req.user.sub)

  return reply.send({ id, message: 'Upload realizado com sucesso.' })
})

app.get('/jobs', { preHandler: [app.authenticate] }, async (req) => {
  return loadJobs(req.user.sub)
})

app.get('/jobs/stream', { preHandler: [app.authenticate] }, (req, reply) => {
  const userId = req.user.sub
  const channel = `jobs:${userId}`

  reply.raw.setHeader('Content-Type', 'text/event-stream')
  reply.raw.setHeader('Cache-Control', 'no-cache')
  reply.raw.setHeader('Connection', 'keep-alive')
  reply.raw.flushHeaders()

  loadJobs(userId).then(jobs => {
    reply.raw.write(`data: ${JSON.stringify(jobs)}\n\n`)
  }).catch(() => {})

  if (!sseClients.has(channel)) sseClients.set(channel, new Set())
  const clients = sseClients.get(channel)
  clients.add(reply.raw)
  if (clients.size === 1) redisSub.subscribe(channel)

  const keepAlive = setInterval(() => reply.raw.write(': ping\n\n'), 25000)

  const cleanup = () => {
    clearInterval(keepAlive)
    clients.delete(reply.raw)
    if (clients.size === 0) {
      sseClients.delete(channel)
      redisSub.unsubscribe(channel)
    }
  }
  req.raw.on('close', cleanup)

  return new Promise((resolve) => req.raw.on('close', resolve))
})

app.get('/results/:filename', { preHandler: [app.authenticate] }, async (req, reply) => {
  const { filename } = req.params

  if (!/^[\w-]+\.md$/.test(filename)) {
    return reply.status(400).send({ error: 'Nome de arquivo inválido.' })
  }

  const jobId = filename.replace(/\.md$/, '')
  const owner = await getJobOwner(jobId)

  if (owner !== req.user.sub) {
    return reply.status(403).send({ error: 'Acesso negado.' })
  }

  reply.header('Content-Type', 'text/markdown; charset=utf-8')
  reply.header('Content-Disposition', `attachment; filename="${filename}"`)

  return reply.send(createReadStream(path.join(RESULTS_DIR, filename)))
})

app.delete('/jobs/:id', { preHandler: [app.authenticate] }, async (req, reply) => {
  const { id } = req.params
  const owner  = await getJobOwner(id)

  if (owner === null) return reply.status(404).send({ error: 'Job não encontrado.' })
  if (owner !== req.user.sub) return reply.status(403).send({ error: 'Acesso negado.' })

  const resultFile = await deleteJob(id)

  if (resultFile) {
    unlink(path.join(RESULTS_DIR, resultFile), (err) => {
      if (err && err.code !== 'ENOENT') app.log.error(err, 'Erro ao deletar arquivo resultado')
    })
  }

  return reply.send({ ok: true })
})

try {
  await app.listen({ port: 3000, host: '0.0.0.0' })
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
