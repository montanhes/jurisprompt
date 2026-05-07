import Fastify from 'fastify'
import multipart from '@fastify/multipart'
import staticPlugin from '@fastify/static'
import cors from '@fastify/cors'
import { createWriteStream, createReadStream } from 'fs'
import { mkdir } from 'fs/promises'
import { pipeline } from 'stream/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'
import { pdfQueue } from './queue.js'
import { initDb, addJob, loadJobs, getJobOwner } from './db.js'
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

app.post('/upload', { preHandler: [app.authenticate] }, async (req, reply) => {
  let data
  try {
    data = await req.file()
  } catch {
    return reply.status(400).send({ error: 'Requisição inválida.' })
  }

  if (!data) return reply.status(400).send({ error: 'Nenhum arquivo enviado.' })

  if (!data.filename.toLowerCase().endsWith('.pdf')) {
    data.file.resume()
    return reply.status(400).send({ error: 'Apenas arquivos .pdf são aceitos.' })
  }

  const id = uuidv4()
  const filePath = path.join(UPLOADS_DIR, `${id}.pdf`)

  try {
    await pipeline(data.file, createWriteStream(filePath))
  } catch (err) {
    app.log.error(err, 'Erro ao salvar arquivo')
    return reply.status(500).send({ error: 'Erro ao salvar arquivo.' })
  }

  await addJob({ id, userId: req.user.sub, originalName: data.filename })
  await pdfQueue.add('process-pdf', { id, filePath, originalName: data.filename }, {
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

  if (!/^[\w-]+\.txt$/.test(filename)) {
    return reply.status(400).send({ error: 'Nome de arquivo inválido.' })
  }

  const jobId = filename.replace(/\.txt$/, '')
  const owner = await getJobOwner(jobId)

  if (owner !== req.user.sub) {
    return reply.status(403).send({ error: 'Acesso negado.' })
  }

  reply.header('Content-Type', 'text/plain; charset=utf-8')
  reply.header('Content-Disposition', `attachment; filename="${filename}"`)

  return reply.send(createReadStream(path.join(RESULTS_DIR, filename)))
})

try {
  await app.listen({ port: 3000, host: '0.0.0.0' })
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
