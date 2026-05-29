import { useQueryClient } from '@tanstack/react-query'
import type { User } from '../../types'

interface Props {
  user: User
  serviceOnline: boolean
}

const PLAN_BADGE: Record<string, { label: string; className: string }> = {
  free:    { label: 'Free',    className: 'bg-surface-container text-outline border border-outline-variant' },
  pro:     { label: 'Pro',     className: 'bg-primary/10 text-primary border border-primary/30' },
  premium: { label: 'Premium', className: 'bg-secondary/10 text-secondary border border-secondary/30' },
}

export default function DashboardHeader({ user, serviceOnline }: Props) {
  const queryClient = useQueryClient()

  async function logout() {
    await fetch('/auth/logout', { method: 'POST' })
    queryClient.setQueryData(['auth'], null)
  }

  const badge = PLAN_BADGE[user.plan] ?? PLAN_BADGE.free

  return (
    <header className="bg-surface border-b border-outline-variant sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-margin-mobile md:px-margin-desktop py-3.5 flex items-center gap-base">
        <div className="w-9 h-9 bg-primary rounded-md flex items-center justify-center flex-shrink-0 shadow-sm">
          <svg className="w-5 h-5 text-on-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div>
          <h1 className="text-headline-md font-bold text-on-surface leading-tight">Zpply</h1>
          <p className="text-label-sm text-outline leading-tight">Conversão de PDFs para Markdown</p>
        </div>

        <div className="ml-auto flex items-center gap-base">
          <span
            className={`w-2 h-2 rounded-full inline-block transition-colors duration-500 ${serviceOnline ? 'bg-green-400' : 'bg-outline'}`}
          />
          <span className="text-label-sm text-outline hidden sm:inline">
            {serviceOnline ? 'Serviços online' : 'Verificando...'}
          </span>

          <div className="flex items-center gap-sm pl-base border-l border-outline-variant">
            <span className={`text-label-sm font-semibold px-sm py-0.5 rounded-full ${badge.className}`}>
              {badge.label}
            </span>

            {user.picture && (
              <img
                src={user.picture}
                alt={user.name}
                referrerPolicy="no-referrer"
                className="w-7 h-7 rounded-full object-cover bg-surface-container"
              />
            )}
            <span className="text-label-md text-on-surface hidden sm:inline max-w-[120px] truncate">
              {user.name}
            </span>
            <button
              onClick={logout}
              className="text-label-sm text-outline hover:text-on-surface transition-colors px-sm py-xs rounded hover:bg-surface-container"
            >
              Sair
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
