import { useRef, useState } from 'react'
import { useUpload } from '../../hooks/useUpload'

export default function UploadCard() {
  const { upload, uploading, filename, percent } = useUpload()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pageStart, setPageStart] = useState('')
  const [pageEnd, setPageEnd] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const dragCounter = useRef(0)

  function handleFile(file: File) {
    upload(file, pageStart ? Number(pageStart) : undefined, pageEnd ? Number(pageEnd) : undefined)
  }

  function onDragEnter(e: React.DragEvent) {
    e.preventDefault()
    dragCounter.current++
    setDragActive(true)
  }

  function onDragLeave() {
    dragCounter.current--
    if (dragCounter.current === 0) setDragActive(false)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    dragCounter.current = 0
    setDragActive(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div className="bg-surface rounded-lg border border-outline-variant shadow-sm overflow-hidden">
      <div className="px-md py-base border-b border-outline-variant flex flex-wrap items-end justify-between gap-md">
        <div>
          <h2 className="text-label-md font-semibold text-on-surface">Enviar documento PDF</h2>
          <p className="text-label-sm text-outline mt-0.5">
            Relatórios, manuais, artigos, contratos e mais · até 500 páginas · Máx. 500 MB
          </p>
        </div>
        <div className="flex items-center gap-sm flex-shrink-0">
          <span className="text-label-sm text-outline whitespace-nowrap">Páginas (opcional)</span>
          <input
            type="number"
            min={1}
            placeholder="De"
            value={pageStart}
            onChange={e => setPageStart(e.target.value)}
            className="w-16 text-label-sm border border-outline-variant rounded px-sm py-xs text-on-surface placeholder-outline focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          <span className="text-label-sm text-outline-variant">–</span>
          <input
            type="number"
            min={1}
            placeholder="Até"
            value={pageEnd}
            onChange={e => setPageEnd(e.target.value)}
            className="w-16 text-label-sm border border-outline-variant rounded px-sm py-xs text-on-surface placeholder-outline focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
      </div>

      <div className="p-md">
        {/* Drop zone */}
        <div
          onDragEnter={onDragEnter}
          onDragLeave={onDragLeave}
          onDragOver={e => e.preventDefault()}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-md p-10 sm:p-14 text-center cursor-pointer transition-all duration-200 select-none
            ${dragActive
              ? 'border-primary bg-primary-fixed/30'
              : 'border-outline-variant hover:border-primary/50'
            }`}
        >
          <div className={`w-14 h-14 rounded-lg flex items-center justify-center mx-auto mb-md transition-colors duration-200
            ${dragActive ? 'bg-primary-fixed' : 'bg-surface-container-low'}`}>
            <svg className={`w-7 h-7 transition-colors duration-200 ${dragActive ? 'text-primary' : 'text-primary/60'}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <p className="text-on-surface font-medium text-body-md">Arraste o PDF aqui</p>
          <p className="text-outline text-label-md mt-1">ou clique para selecionar</p>
          <div className="mt-md inline-flex items-center gap-sm bg-primary hover:bg-primary-container text-on-primary px-md py-sm rounded-full text-label-md font-semibold transition-colors shadow-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Selecionar Arquivo
          </div>
        </div>

        {/* Upload progress */}
        {uploading && (
          <div className="mt-md bg-surface-container-low rounded-md p-md border border-outline-variant">
            <div className="flex items-center justify-between mb-sm">
              <div className="flex items-center gap-sm min-w-0">
                <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <span className="text-label-md font-medium text-on-surface truncate max-w-xs">{filename}</span>
              </div>
              <span className="text-label-md font-semibold text-primary ml-base flex-shrink-0">{percent}%</span>
            </div>
            <div className="w-full bg-outline-variant h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-secondary h-1.5 rounded-full transition-all duration-200 ease-out"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
            e.target.value = ''
          }}
        />
      </div>
    </div>
  )
}
