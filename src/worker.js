import { Worker } from 'bullmq'
import IORedis from 'ioredis'
import axios from 'axios'
import FormData from 'form-data'
import { createReadStream, unlink } from 'fs'
import { readFile, writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { createRequire } from 'module'
import { initDb, updateJob } from './db.js'

const require = createRequire(import.meta.url)
const pdfParse = require('pdf-parse')

const RESULTS_DIR = process.env.RESULTS_DIR || '/app/results'
const GROBID_URL = process.env.GROBID_URL || 'http://grobid:8070'

await mkdir(RESULTS_DIR, { recursive: true })
await initDb()

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
})

function decodeEntities(str) {
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#\d+;/g, ' ')
}

function stripTags(str) {
  return str.replace(/<[^>]+>/g, ' ')
}

function cleanWhitespace(str) {
  return str
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function extractTextFromTEI(xml) {
  const bodyMatch     = xml.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  const abstractMatch = xml.match(/<abstract[^>]*>([\s\S]*?)<\/abstract>/i)
  const titleMatch    = xml.match(/<title[^>]*level="a"[^>]*>([\s\S]*?)<\/title>/i)

  const title    = titleMatch    ? cleanWhitespace(decodeEntities(stripTags(titleMatch[1])))    : ''
  const abstract = abstractMatch ? cleanWhitespace(decodeEntities(stripTags(abstractMatch[1]))) : ''
  const rawBody  = bodyMatch ? bodyMatch[1] : xml
  const bodyText = cleanWhitespace(decodeEntities(stripTags(rawBody)))

  return [title, abstract, bodyText].filter(Boolean).join('\n\n')
}

function addPageMarkers(text, pageCount) {
  if (pageCount <= 1) return `- page 1\n${text}`

  const charsPerPage = Math.floor(text.length / pageCount)
  const pages = []
  let pos = 0

  for (let page = 1; page <= pageCount; page++) {
    const isLast    = page === pageCount
    const targetEnd = isLast ? text.length : pos + charsPerPage

    let breakPos = targetEnd
    if (!isLast) {
      const searchFrom = Math.max(pos, targetEnd - 500)
      const searchTo   = Math.min(text.length, targetEnd + 500)
      const slice      = text.slice(searchFrom, searchTo)
      const idx        = slice.lastIndexOf('\n\n')
      breakPos = idx !== -1 ? searchFrom + idx : targetEnd
    }

    const pageText = text.slice(pos, breakPos).trim()
    if (pageText) pages.push(`- page ${page}\n${pageText}`)
    pos = breakPos
  }

  return pages.join('\n')
}

async function processJob(job) {
  const { id, filePath, originalName } = job.data

  console.log(`[worker] Iniciando job ${id} — ${originalName}`)
  await updateJob(id, { status: 'processing' })

  const pdfBuffer = await readFile(filePath)
  const { numpages } = await pdfParse(pdfBuffer)
  console.log(`[worker] PDF tem ${numpages} página(s)`)

  const form = new FormData()
  form.append('input', createReadStream(filePath))
  form.append('consolidateHeader', '0')
  form.append('consolidateCitations', '0')
  form.append('includeRawCitations', '1')
  form.append('includeRawAffiliations', '1')
  form.append('teiCoordinates', '0')
  form.append('segmentSentences', '0')

  const response = await axios.post(
    `${GROBID_URL}/api/processFulltextDocument`,
    form,
    {
      headers: form.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 10 * 60 * 1000,
      responseType: 'text',
    },
  )

  const rawText = extractTextFromTEI(response.data)
  const text    = addPageMarkers(rawText, numpages)

  const resultFilename = `${id}.txt`
  await writeFile(path.join(RESULTS_DIR, resultFilename), text, 'utf-8')
  console.log(`[worker] TXT salvo: ${resultFilename} (${text.length} chars, ${numpages} páginas)`)

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
  }
})

worker.on('completed', (job) => {
  console.log(`[worker] BullMQ confirmou job ${job.id} completo.`)
})

worker.on('error', (err) => {
  console.error('[worker] Erro no worker:', err)
})

console.log('[worker] Aguardando jobs de processamento PDF...')
