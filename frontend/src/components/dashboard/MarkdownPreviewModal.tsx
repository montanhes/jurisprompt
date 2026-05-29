import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { marked } from 'marked'

interface Props {
  markdown: string
  filename: string
  resultFile: string
  onClose: () => void
}

export default function MarkdownPreviewModal({ markdown, filename, resultFile, onClose }: Props) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function copyMarkdown() {
    try {
      await navigator.clipboard.writeText(markdown)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback para browsers sem clipboard API
      const ta = document.createElement('textarea')
      ta.value = markdown
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const rendered = marked.parse(markdown) as string

  return createPortal(
    <div className="fixed inset-0 z-50" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
    <div className="absolute inset-[50px] flex flex-col max-w-5xl mx-auto rounded-lg overflow-hidden shadow-2xl" style={{ background: '#0f172a' }} onClick={e => e.stopPropagation()}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-md py-base flex-shrink-0"
        style={{ background: '#1e293b', borderBottom: '1px solid #334155' }}
      >
        <div className="flex items-center gap-base min-w-0">
          <div className="w-7 h-7 bg-primary rounded flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-on-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="text-label-md truncate max-w-xs sm:max-w-lg" style={{ color: '#cbd5e1' }}>
            {filename}
          </span>
        </div>

        <div className="flex items-center gap-sm flex-shrink-0 ml-md">
          <button
            onClick={copyMarkdown}
            className="inline-flex items-center gap-1.5 px-base py-xs rounded text-label-sm font-medium transition-colors"
            style={{ background: copied ? '#166534' : '#334155', color: copied ? '#bbf7d0' : '#cbd5e1' }}
          >
            {copied ? (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Copiado!
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copiar
              </>
            )}
          </button>
          <a
            href={`/results/${resultFile}`}
            download={filename}
            className="inline-flex items-center gap-1.5 px-base py-xs bg-primary hover:bg-primary-container text-on-primary rounded text-label-sm font-medium transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Baixar MD
          </a>
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-base py-xs rounded text-label-sm font-medium transition-colors"
            style={{ background: '#334155', color: '#cbd5e1' }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Fechar
          </button>
        </div>
      </div>

      {/* Rendered only */}
      <div className="flex-1 overflow-auto p-lg bg-surface-container-lowest">
        <div className="max-w-3xl mx-auto">
          <div
            className="markdown-preview text-on-surface text-body-md leading-relaxed"
            dangerouslySetInnerHTML={{ __html: rendered }}
          />
        </div>
      </div>
    </div>
    </div>,
    document.body
  )
}
