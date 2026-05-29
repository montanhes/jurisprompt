import { useRef, useState } from 'react'
import { useUpload } from '../../hooks/useUpload'
import type { Converter } from '../../types'

export default function UploadCard() {
  const { upload, uploading, filename, percent } = useUpload()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pageStart, setPageStart] = useState('')
  const [pageEnd, setPageEnd] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const dragCounter = useRef(0)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [converter, setConverter] = useState<Converter | null>(null)

  function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith('.pdf')) return
    setPendingFile(file)
  }

  function handleSubmit() {
    if (!pendingFile) return
    if (!converter) return
    upload(pendingFile, converter, pageStart ? Number(pageStart) : undefined, pageEnd ? Number(pageEnd) : undefined)
    setPendingFile(null)
    setConverter(null)
    setPageStart('')
    setPageEnd('')
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

  const canSubmit = !!pendingFile && !!converter && !uploading

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

      <div className="p-md space-y-md">
        {/* Drop zone */}
        <div
          onDragEnter={onDragEnter}
          onDragLeave={onDragLeave}
          onDragOver={e => e.preventDefault()}
          onDrop={onDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-md p-8 sm:p-10 text-center transition-all duration-200 select-none
            ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            ${dragActive
              ? 'border-primary bg-primary-fixed/30'
              : pendingFile
                ? 'border-primary/60 bg-surface-container-low'
                : 'border-outline-variant hover:border-primary/50'
            }`}
        >
          {pendingFile ? (
            <div className="flex flex-col items-center gap-sm">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-primary-fixed">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-on-surface font-medium text-body-md truncate max-w-xs">{pendingFile.name}</p>
              <p className="text-outline text-label-sm">{(pendingFile.size / (1024 * 1024)).toFixed(1)} MB · clique para trocar</p>
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>

        {/* Seleção de motor */}
        <div>
          <p className="text-label-sm font-medium text-on-surface mb-sm">
            Motor de conversão <span className="text-error">*</span>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-sm">
            {/* Docling */}
            <button
              type="button"
              onClick={() => setConverter('docling')}
              disabled={uploading}
              className={`text-left p-md rounded-lg border-2 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed
                ${converter === 'docling'
                  ? 'border-primary bg-primary-fixed/20'
                  : 'border-outline-variant hover:border-primary/40 bg-surface-container-low'
                }`}
            >
              <div className="flex items-center gap-sm mb-xs">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0
                  ${converter === 'docling' ? 'border-primary' : 'border-outline-variant'}`}>
                  {converter === 'docling' && <div className="w-2 h-2 rounded-full bg-primary" />}
                </div>
                <span className="text-label-md font-semibold text-on-surface">Docling</span>
              </div>
              <p className="text-label-sm text-outline pl-6">Alta precisão, tabelas e layout complexo. Mais lento (modelos ML).</p>
            </button>

            {/* PyMuPDF4LLM */}
            <button
              type="button"
              onClick={() => setConverter('pymupdf')}
              disabled={uploading}
              className={`text-left p-md rounded-lg border-2 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed
                ${converter === 'pymupdf'
                  ? 'border-primary bg-primary-fixed/20'
                  : 'border-outline-variant hover:border-primary/40 bg-surface-container-low'
                }`}
            >
              <div className="flex items-center gap-sm mb-xs">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0
                  ${converter === 'pymupdf' ? 'border-primary' : 'border-outline-variant'}`}>
                  {converter === 'pymupdf' && <div className="w-2 h-2 rounded-full bg-primary" />}
                </div>
                <span className="text-label-md font-semibold text-on-surface">PyMuPDF4LLM</span>
              </div>
              <p className="text-label-sm text-outline pl-6">Rápido (segundos), ideal para PDFs nativos sem OCR.</p>
            </button>
          </div>
        </div>

        {/* Botão converter */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`w-full py-sm rounded-lg text-label-md font-semibold transition-all duration-150 flex items-center justify-center gap-sm
            ${canSubmit
              ? 'bg-primary text-on-primary hover:bg-primary/90 shadow-sm cursor-pointer'
              : 'bg-surface-container text-outline cursor-not-allowed'
            }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {!pendingFile ? 'Selecione um arquivo' : !converter ? 'Escolha o motor de conversão' : 'Converter'}
        </button>

        {/* Upload progress */}
        {uploading && (
          <div className="bg-surface-container-low rounded-md p-md border border-outline-variant">
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
