export default function EmptyState() {
  return (
    <div className="py-16 text-center">
      <div className="w-12 h-12 bg-surface-container rounded-lg flex items-center justify-center mx-auto mb-base">
        <svg className="w-6 h-6 text-outline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <p className="text-outline text-label-md font-medium">Nenhum documento na fila</p>
      <p className="text-outline-variant text-label-sm mt-1">Envie um PDF para iniciar a extração</p>
    </div>
  )
}
