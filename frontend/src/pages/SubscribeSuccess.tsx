import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'

export default function SubscribeSuccess() {
  const queryClient = useQueryClient()

  useEffect(() => {
    // Força refresh do usuário para refletir o novo plano (após webhook do AbacatePay)
    queryClient.invalidateQueries({ queryKey: ['auth'] })
  }, [queryClient])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-margin-mobile">
      <div className="max-w-md w-full bg-surface rounded-lg border border-outline-variant p-xl text-center flex flex-col gap-lg">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <span className="material-symbols-outlined text-primary" style={{ fontSize: 40 }}>check_circle</span>
        </div>

        <div className="flex flex-col gap-sm">
          <h1 className="font-sans font-bold text-headline-md text-on-surface">Pagamento confirmado!</h1>
          <p className="text-body-md text-on-surface-variant">
            Seu plano está sendo ativado. Em instantes você terá acesso completo às funcionalidades.
          </p>
        </div>

        <a
          href="/"
          className="w-full inline-flex items-center justify-center bg-primary text-on-primary px-md py-sm rounded-full text-label-md font-semibold hover:opacity-90 transition-all"
        >
          Ir para o dashboard
        </a>
      </div>
    </div>
  )
}
