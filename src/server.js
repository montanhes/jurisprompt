import Fastify from 'fastify'
import multipart from '@fastify/multipart'
import staticPlugin from '@fastify/static'
import cors from '@fastify/cors'
import { createWriteStream, createReadStream, unlink } from 'fs'
import { mkdir } from 'fs/promises'
import { pipeline } from 'stream/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'
import { pdfQueue } from './queue.js'
import { initDb, addJob, loadJobs, getJobOwner, deleteJob } from './db.js'
import authPlugin from './auth.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const UPLOADS_DIR = process.env.UPLOADS_DIR || '/app/uploads'
const RESULTS_DIR = process.env.RESULTS_DIR || '/app/results'

await mkdir(UPLOADS_DIR, { recursive: true })
await mkdir(RESULTS_DIR, { recursive: true })
await initDb()

const app = Fastify({ logger: { level: 'info' } })

await app.register(cors)
await app.register(authPlugin)

await app.register(multipart, {
  limits: { fileSize: 500 * 1024 * 1024, files: 1 },
})

await app.register(staticPlugin, {
  root: path.join(__dirname, 'public'),
  prefix: '/',
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
  const id = uuidv4()
  const filePath = path.join(UPLOADS_DIR, `${id}.pdf`)
  let originalName = null
  let pageStart = null
  let pageEnd = null

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
        if (part.fieldname === 'pageStart') pageStart = parseInt(part.value) || null
        if (part.fieldname === 'pageEnd')   pageEnd   = parseInt(part.value) || null
      }
    }
  } catch (err) {
    app.log.error(err, 'Erro ao processar upload')
    return reply.status(400).send({ error: 'Requisição inválida.' })
  }

  if (!originalName) return reply.status(400).send({ error: 'Nenhum arquivo enviado.' })

  await addJob({ id, userId: req.user.sub, originalName })
  await pdfQueue.add('process-pdf', { id, filePath, originalName, pageStart, pageEnd }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 10000 },
  })

  return reply.send({ id, message: 'Upload realizado com sucesso.' })
})

app.get('/jobs', { preHandler: [app.authenticate] }, async (req) => {
  return loadJobs(req.user.sub)
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
  const owner = await getJobOwner(id)

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
