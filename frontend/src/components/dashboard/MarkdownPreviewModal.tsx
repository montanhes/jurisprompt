import { useEffect, useRef } from 'react'
import { marked } from 'marked'

interface Props {
  markdown: string
  filename: string
  resultFile: string
  onClose: () => void
}

export default function MarkdownPreviewModal({ markdown, filename, resultFile, onClose }: Props) {
  const leftRef = useRef<HTMLDivElement>(null)
  const rightRef = useRef<HTMLDivElement>(null)
  const syncing = useRef(false)

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

  useEffect(() => {
    const left = leftRef.current
    const right = rightRef.current
    if (!left || !right) return

    function syncFrom(source: HTMLDivElement, target: HTMLDivElement) {
      if (syncing.current) return
      syncing.current = true
      const pct = source.scrollTop / (source.scrollHeight - source.clientHeight)
      target.scrollTop = pct * (target.scrollHeight - target.clientHeight)
      syncing.current = false
    }

    const onLeftScroll = () => syncFrom(left, right)
    const onRightScroll = () => syncFrom(right, left)
    left.addEventListener('scroll', onLeftScroll)
    right.addEventListener('scroll', onRightScroll)
    return () => {
      left.removeEventListener('scroll', onLeftScroll)
      right.removeEventListener('scroll', onRightScroll)
    }
  }, [])

  const rendered = marked.parse(markdown) as string

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: '#0f172a' }}
    >
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

      {/* Split view */}
      <div className="flex flex-1 overflow-hidden">
        {/* Source */}
        <div className="flex flex-col w-1/2 overflow-hidden" style={{ borderRight: '1px solid #334155' }}>
          <div className="px-md py-xs flex-shrink-0" style={{ background: '#1e293b', borderBottom: '1px solid #334155' }}>
            <span className="text-label-sm uppercase tracking-wider" style={{ color: '#64748b' }}>Markdown</span>
          </div>
          <div ref={leftRef} className="flex-1 overflow-auto p-md" style={{ background: '#0f172a' }}>
            <pre className="text-label-sm font-mono whitespace-pre-wrap leading-relaxed" style={{ color: '#94a3b8' }}>
              {markdown}
            </pre>
          </div>
        </div>

        {/* Rendered */}
        <div className="flex flex-col w-1/2 overflow-hidden bg-surface-container-lowest">
          <div className="px-md py-xs flex-shrink-0 bg-surface-container-lowest border-b border-outline-variant">
            <span className="text-label-sm text-outline uppercase tracking-wider">Visualização</span>
          </div>
          <div ref={rightRef} className="flex-1 overflow-auto p-lg bg-surface-container-lowest">
            <div
              className="markdown-preview text-on-surface text-body-md leading-relaxed"
              dangerouslySetInnerHTML={{ __html: rendered }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
