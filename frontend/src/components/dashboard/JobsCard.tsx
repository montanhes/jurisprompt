import { useState } from 'react'
import { fetchResult } from '../../lib/api'
import { useToast } from '../../hooks/useToast'
import StatusBadge from '../ui/StatusBadge'
import EmptyState from './EmptyState'
import MarkdownPreviewModal from './MarkdownPreviewModal'
import type { Job } from '../../types'

function formatDate(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

interface PreviewState {
  markdown: string
  filename: string
  resultFile: string
}

interface Props {
  jobs: Job[]
  isFetching: boolean
  connected: boolean
  removeJob: (id: string) => Promise<void>
}

export default function JobsCard({ jobs, isFetching, connected, removeJob }: Props) {
  const { showToast } = useToast()
  const [preview, setPreview] = useState<PreviewState | null>(null)

  async function openPreview(job: Job) {
    if (!job.resultFile) return
    const mdName = job.originalName.replace(/\.pdf$/i, '.md')
    try {
      const markdown = await fetchResult(job.resultFile)
      setPreview({ markdown, filename: mdName, resultFile: job.resultFile })
    } catch (err) {
      showToast('Erro ao carregar preview: ' + (err instanceof Error ? err.message : 'Erro'), 'error')
    }
  }

  async function copyMarkdown(job: Job) {
    if (!job.resultFile) return
    try {
      const markdown = await fetchResult(job.resultFile)
      await navigator.clipboard.writeText(markdown)
      showToast('Markdown copiado!', 'success')
    } catch {
      showToast('Erro ao copiar markdown.', 'error')
    }
  }

  return (
    <>
      <div className="bg-surface rounded-lg border border-outline-variant shadow-sm overflow-hidden">
        <div className="px-md py-base border-b border-outline-variant flex items-center justify-between gap-base">
          <div>
            <h2 className="text-label-md font-semibold text-on-surface">Fila de Processamento</h2>
            <p className="text-label-sm text-outline mt-0.5">Tempo real</p>
          </div>
          <div className="flex items-center gap-sm flex-shrink-0">
            <div className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${connected ? 'bg-green-400' : isFetching ? 'bg-primary animate-pulse' : 'bg-outline-variant'}`} />
            <span className="bg-surface-container text-on-surface-variant text-label-sm font-semibold px-sm py-xs rounded-full">
              {jobs.length}
            </span>
          </div>
        </div>

        {jobs.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-outline-variant">
                  {['Arquivo', 'Status', 'Envio', 'Conclusão', 'Download'].map((col, i) => (
                    <th
                      key={col}
                      className={`text-left px-md py-base text-label-sm text-outline uppercase tracking-wider bg-surface-container-low/60
                        ${i === 2 ? 'hidden sm:table-cell' : ''}
                        ${i === 3 ? 'hidden md:table-cell' : ''}
                        ${i === 4 ? 'text-right' : ''}`}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/50">
                {jobs.map(job => (
                  <tr key={job.id} className="hover:bg-surface-container-low/50 transition-colors">
                    {/* Arquivo */}
                    <td className="px-md py-base">
                      <div className="flex items-center gap-base min-w-0">
                        <div className="w-8 h-8 bg-surface-container rounded flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-outline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <p className="text-label-md font-medium text-on-surface truncate max-w-[160px] sm:max-w-xs" title={job.originalName}>
                            {job.originalName}
                          </p>
                          <p className="text-label-sm text-outline font-mono mt-0.5">{job.id.slice(0, 8)}</p>
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-md py-base">
                      <StatusBadge status={job.status} />
                    </td>

                    {/* Envio */}
                    <td className="px-md py-base hidden sm:table-cell">
                      <span className="text-label-md text-on-surface-variant">{formatDate(job.createdAt)}</span>
                    </td>

                    {/* Conclusão */}
                    <td className="px-md py-base hidden md:table-cell">
                      <span className="text-label-md text-on-surface-variant">{formatDate(job.completedAt)}</span>
                    </td>

                    {/* Ações */}
                    <td className="px-md py-base text-right whitespace-nowrap">
                      <ActionButtons job={job} onPreview={() => openPreview(job)} onCopy={() => copyMarkdown(job)} onDelete={() => removeJob(job.id)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {preview && (
        <MarkdownPreviewModal
          markdown={preview.markdown}
          filename={preview.filename}
          resultFile={preview.resultFile}
          onClose={() => setPreview(null)}
        />
      )}
    </>
  )
}

function DeleteBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="Remover"
      className="inline-flex items-center justify-center w-8 h-8 bg-error-container/30 hover:bg-error-container text-on-error-container rounded transition-colors"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    </button>
  )
}

function ActionButtons({ job, onPreview, onCopy, onDelete }: { job: Job; onPreview: () => void; onCopy: () => void; onDelete: () => void }) {
  if (job.status === 'done' && job.resultFile) {
    const mdName = job.originalName.replace(/\.pdf$/i, '.md')
    return (
      <div className="inline-flex items-center gap-1.5">
        <button
          onClick={onPreview}
          title="Visualizar"
          className="inline-flex items-center justify-center w-8 h-8 bg-surface-container hover:bg-surface-container-high text-on-surface-variant rounded transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </button>
        <button
          onClick={onCopy}
          title="Copiar Markdown"
          className="inline-flex items-center justify-center w-8 h-8 bg-surface-container hover:bg-surface-container-high text-on-surface-variant rounded transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>
        <a
          href={`/results/${job.resultFile}`}
          download={mdName}
          title="Baixar MD"
          className="inline-flex items-center justify-center w-8 h-8 bg-primary hover:bg-primary-container text-on-primary rounded transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </a>
        <DeleteBtn onClick={onDelete} />
      </div>
    )
  }

  if (job.status === 'error') {
    return <div className="inline-flex items-center gap-1.5"><DeleteBtn onClick={onDelete} /></div>
  }

  return (
    <button
      disabled
      title="Baixar MD"
      className="inline-flex items-center justify-center w-8 h-8 bg-surface-container text-outline rounded cursor-not-allowed"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
    </button>
  )
}
