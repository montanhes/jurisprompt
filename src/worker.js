import { Worker } from 'bullmq'
import IORedis from 'ioredis'
import axios from 'axios'
import FormData from 'form-data'
import { createReadStream, unlink } from 'fs'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { initDb, updateJob } from './db.js'

const RESULTS_DIR = process.env.RESULTS_DIR || '/app/results'
const DOCLING_URL = process.env.DOCLING_URL || 'http://docling:8000'

await mkdir(RESULTS_DIR, { recursive: true })
await initDb()

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
})

const redisPub = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379')


async function processJob(job) {
  const { id, userId, filePath, originalName, pageStart, pageEnd } = job.data

  const notify = () => userId && redisPub.publish(`jobs:${userId}`, '1').catch(() => {})

  console.log(`[worker] Iniciando job ${id} — ${originalName}`)
  await updateJob(id, { status: 'processing' })
  notify()

  const form = new FormData()
  form.append('file', createReadStream(filePath), { filename: originalName })
  if (pageStart) form.append('page_start', String(pageStart))
  if (pageEnd)   form.append('page_end',   String(pageEnd))

  const response = await axios.post(
    `${DOCLING_URL}/convert`,
    form,
    {
      headers: form.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 10 * 60 * 1000,
    },
  )

  const markdown = response.data.markdown
  const resultFilename = `${id}.md`
  await writeFile(path.join(RESULTS_DIR, resultFilename), markdown, 'utf-8')
  console.log(`[worker] MD salvo: ${resultFilename} (${markdown.length} chars)`)

  unlink(filePath, (err) => {
    if (err) console.error(`[worker] Erro ao deletar PDF ${filePath}:`, err.message)
    else console.log(`[worker] PDF deletado: ${filePath}`)
  })

  await updateJob(id, {
    status: 'done',
    resultFile: resultFilename,
    completedAt: new Date().toISOString(),
    error: null,
  })
  notify()

  console.log(`[worker] Job ${id} concluído.`)
}

const worker = new Worker('pdf-processing', processJob, { connection, concurrency: 1 })

worker.on('failed', async (job, err) => {
  console.error(`[worker] Job ${job?.data?.id} falhou:`, err.message)
  if (job?.data?.id) {
    await updateJob(job.data.id, {
      status: 'error',
      error: err.message,
      completedAt: new Date().toISOString(),
    })
    if (job.data.userId) redisPub.publish(`jobs:${job.data.userId}`, '1').catch(() => {})
  }
})

worker.on('completed', (job) => {
  console.log(`[worker] BullMQ confirmou job ${job.id} completo.`)
})

worker.on('error', (err) => {
  console.error('[worker] Erro no worker:', err)
})

console.log('[worker] Aguardando jobs de processamento PDF...')
