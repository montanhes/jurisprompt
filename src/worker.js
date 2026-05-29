import { Worker, FlowProducer } from 'bullmq'
import IORedis from 'ioredis'
import axios from 'axios'
import FormData from 'form-data'
import { createReadStream } from 'fs'
import { writeFile, readFile, unlink, mkdir } from 'fs/promises'
import path from 'path'
import { PDFDocument } from 'pdf-lib'
import { initDb, updateJob } from './db.js'

const RESULTS_DIR = process.env.RESULTS_DIR || '/app/results'
const DOCLING_URL  = process.env.DOCLING_URL  || 'http://docling:8000'
const PYMUPDF_URL  = process.env.PYMUPDF_URL  || 'http://pymupdf:8000'
const CHUNK_SIZE   = parseInt(process.env.CHUNK_SIZE || '50', 10)
const REDIS_URL    = process.env.REDIS_URL    || 'redis://localhost:6379'

await mkdir(RESULTS_DIR, { recursive: true })
await initDb()

const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null, enableReadyCheck: false })
const redisPub   = new IORedis(REDIS_URL)
const flowConn   = new IORedis(REDIS_URL, { maxRetriesPerRequest: null, enableReadyCheck: false })
const flowProducer = new FlowProducer({ connection: flowConn })

const notify = (userId) => userId && redisPub.publish(`jobs:${userId}`, '1').catch(() => {})

// ── Conversion service call ───────────────────────────────────────────────────

async function callConverter({ filePath, originalName, pageStart, pageEnd, converter }) {
  const serviceUrl = converter === 'pymupdf' ? PYMUPDF_URL : DOCLING_URL
  const form = new FormData()
  form.append('file', createReadStream(filePath), { filename: originalName })
  if (pageStart) form.append('page_start', String(pageStart))
  if (pageEnd)   form.append('page_end',   String(pageEnd))

  const response = await axios.post(`${serviceUrl}/convert`, form, {
    headers: form.getHeaders(),
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
    timeout: 10 * 60 * 1000,
  })
  return response.data.markdown
}

// ── Chunk file helpers ────────────────────────────────────────────────────────

// Naming: {jobId}_chunk_{index}.md — jobId prefix prevents any cross-job mixing
const chunkPath = (jobId, index) => path.join(RESULTS_DIR, `${jobId}_chunk_${index}.md`)

async function deleteChunkFiles(jobId, totalChunks) {
  await Promise.all(
    Array.from({ length: totalChunks }, (_, i) =>
      unlink(chunkPath(jobId, i)).catch(() => {})
    )
  )
}

// ── Worker 1: Orchestrator (pdf-processing, c:1) ─────────────────────────────

async function processOrchestrate(job) {
  const { id, userId, filePath, originalName, pageStart, pageEnd, converter } = job.data

  console.log(`[orchestrate] Job ${id} — ${originalName}`)
  await updateJob(id, { status: 'processing' })
  notify(userId)

  const pdfBytes = await readFile(filePath)
  const pdfDoc   = await PDFDocument.load(pdfBytes, { ignoreEncryption: true, updateMetadata: false })
  const totalPages = pdfDoc.getPageCount()

  const effectiveStart = pageStart || 1
  const effectiveEnd   = pageEnd   || totalPages
  const effectivePages = effectiveEnd - effectiveStart + 1

  console.log(`[orchestrate] Job ${id} — ${totalPages}p total, processando ${effectivePages}p (${effectiveStart}–${effectiveEnd})`)

  // ── Direct path: PDF pequeno ──────────────────────────────────────────────
  if (effectivePages <= CHUNK_SIZE) {
    const markdown = await callConverter({ filePath, originalName, pageStart, pageEnd, converter })
    const resultFilename = `${id}.md`
    await writeFile(path.join(RESULTS_DIR, resultFilename), markdown, 'utf-8')

    await unlink(filePath).catch(err =>
      console.error(`[orchestrate] Erro ao deletar PDF ${filePath}:`, err.message)
    )

    await updateJob(id, {
      status: 'done',
      resultFile: resultFilename,
      completedAt: new Date().toISOString(),
      error: null,
    })
    notify(userId)
    console.log(`[orchestrate] Job ${id} concluído (direto, ${markdown.length} chars).`)
    return
  }

  // ── Chunked path: cria flow ───────────────────────────────────────────────
  const chunks = []
  for (let start = effectiveStart; start <= effectiveEnd; start += CHUNK_SIZE) {
    chunks.push({ start, end: Math.min(start + CHUNK_SIZE - 1, effectiveEnd) })
  }

  console.log(`[orchestrate] Job ${id} — criando ${chunks.length} chunks de ${CHUNK_SIZE}p`)

  await updateJob(id, { chunksTotal: chunks.length, chunksDone: 0 })

  await flowProducer.add({
    name: `merge-${id}`,
    queueName: 'pdf-merge',
    data: { id, userId, originalName, converter, filePath, totalChunks: chunks.length },
    opts: { attempts: 2, backoff: { type: 'exponential', delay: 10000 } },
    children: chunks.map(({ start, end }, i) => ({
      name: `chunk-${id}-${i}`,
      queueName: 'pdf-chunks',
      data: { jobId: id, chunkIndex: i, totalChunks: chunks.length, pageStart: start, pageEnd: end, filePath, converter, originalName },
      opts: { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    })),
  })

  console.log(`[orchestrate] Flow criado para job ${id} com ${chunks.length} chunks.`)
}

// ── Worker 2: Chunk processor (pdf-chunks, c:4) ───────────────────────────────

async function processChunk(job) {
  const { jobId, chunkIndex, totalChunks, pageStart, pageEnd, filePath, converter, originalName } = job.data

  console.log(`[chunk] Job ${jobId} chunk ${chunkIndex + 1}/${totalChunks} (p.${pageStart}–${pageEnd})`)

  const markdown = await callConverter({ filePath, originalName, pageStart, pageEnd, converter })

  // Salva com nome que inclui o jobId — impossível misturar chunks de jobs diferentes
  await writeFile(chunkPath(jobId, chunkIndex), markdown, 'utf-8')

  console.log(`[chunk] Job ${jobId} chunk ${chunkIndex} salvo (${markdown.length} chars)`)

  await updateJob(jobId, { chunksDone: chunkIndex + 1 }).catch(() => {})

  return { chunkIndex, chunkFile: `${jobId}_chunk_${chunkIndex}.md` }
}

// ── Worker 3: Merge (pdf-merge, c:2) ─────────────────────────────────────────

async function processMerge(job) {
  const { id, userId, originalName, filePath, totalChunks } = job.data

  console.log(`[merge] Job ${id} — unindo ${totalChunks} chunks`)

  const childrenValues = await job.getChildrenValues()
  const chunks = Object.values(childrenValues)
    .sort((a, b) => a.chunkIndex - b.chunkIndex)

  if (chunks.length !== totalChunks) {
    throw new Error(`Esperado ${totalChunks} chunks, recebido ${chunks.length}`)
  }

  // Lê arquivos em ordem, verificando prefixo jobId em cada um
  const parts = await Promise.all(
    chunks.map(({ chunkIndex, chunkFile }) => {
      if (!chunkFile.startsWith(`${id}_chunk_`)) {
        throw new Error(`Arquivo de chunk inesperado para job ${id}: ${chunkFile}`)
      }
      return readFile(path.join(RESULTS_DIR, chunkFile), 'utf-8')
    })
  )

  const markdown = parts.join('\n\n')
  const resultFilename = `${id}.md`
  await writeFile(path.join(RESULTS_DIR, resultFilename), markdown, 'utf-8')
  console.log(`[merge] MD final salvo: ${resultFilename} (${markdown.length} chars)`)

  // Limpa chunk files
  await deleteChunkFiles(id, totalChunks)
  console.log(`[merge] Job ${id}: ${totalChunks} chunk files deletados`)

  // Limpa PDF original
  await unlink(filePath).catch(err =>
    console.error(`[merge] Erro ao deletar PDF ${filePath}:`, err.message)
  )

  await updateJob(id, {
    status: 'done',
    resultFile: resultFilename,
    completedAt: new Date().toISOString(),
    error: null,
    chunksDone: totalChunks,
  })
  notify(userId)

  console.log(`[merge] Job ${id} concluído.`)
}

// ── Workers ───────────────────────────────────────────────────────────────────

const orchestrateWorker = new Worker('pdf-processing', processOrchestrate, { connection, concurrency: 1 })
const chunkWorker       = new Worker('pdf-chunks',     processChunk,        { connection, concurrency: 4 })
const mergeWorker       = new Worker('pdf-merge',      processMerge,        { connection, concurrency: 2 })

// ── Failure handlers ──────────────────────────────────────────────────────────

orchestrateWorker.on('failed', async (job, err) => {
  console.error(`[orchestrate] Job ${job?.data?.id} falhou:`, err.message)
  if (!job?.data?.id) return
  // Limpa PDF (direto path — flow path não chega aqui pois flowProducer.add() não falha silenciosamente)
  if (job.data.filePath) await unlink(job.data.filePath).catch(() => {})
  await updateJob(job.data.id, {
    status: 'error',
    error: err.message,
    completedAt: new Date().toISOString(),
  })
  notify(job.data.userId)
})

chunkWorker.on('failed', (job, err) => {
  // Falha de chunk propaga ao merge job; merge job cuida do cleanup
  console.error(`[chunk] Chunk ${job?.data?.chunkIndex} do job ${job?.data?.jobId} falhou:`, err.message)
})

mergeWorker.on('failed', async (job, err) => {
  console.error(`[merge] Merge do job ${job?.data?.id} falhou:`, err.message)
  if (!job?.data?.id) return
  // Limpa todos os chunk files deste job
  await deleteChunkFiles(job.data.id, job.data.totalChunks)
  // Limpa PDF original
  if (job.data.filePath) await unlink(job.data.filePath).catch(() => {})
  await updateJob(job.data.id, {
    status: 'error',
    error: err.message,
    completedAt: new Date().toISOString(),
  })
  notify(job.data.userId)
})

// ── Boilerplate ───────────────────────────────────────────────────────────────

for (const [label, w] of [['orchestrate', orchestrateWorker], ['chunk', chunkWorker], ['merge', mergeWorker]]) {
  w.on('completed', (job) => console.log(`[${label}] BullMQ confirmou job ${job.id} completo.`))
  w.on('error', (err)    => console.error(`[${label}] Erro no worker:`, err))
}

console.log(`[worker] Aguardando jobs — orchestrate(c:1) | chunks(c:4) | merge(c:2) | CHUNK_SIZE=${CHUNK_SIZE}p`)
