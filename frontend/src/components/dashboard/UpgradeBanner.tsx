import { useState } from 'react'
import { subscribe } from '../../lib/api'
import type { User, Plan, BillingCycle } from '../../types'

interface Props {
  user: User
}

const LIMIT = 5

const PLANS: { plan: Plan; label: string; price: Record<BillingCycle, number> }[] = [
  { plan: 'pro',     label: 'Pro',     price: { mensal: 79,  trimestral: 69,  anual: 59  } },
  { plan: 'premium', label: 'Premium', price: { mensal: 299, trimestral: 264, anual: 249 } },
]

const CYCLES: { key: BillingCycle; label: string }[] = [
  { key: 'mensal',     label: 'Mensal'     },
  { key: 'trimestral', label: 'Trimestral' },
  { key: 'anual',      label: 'Anual'      },
]

export default function UpgradeBanner({ user }: Props) {
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [plan, setPlan]         = useState<Plan>('pro')
  const [billing, setBilling]   = useState<BillingCycle>('mensal')
  const [expanded, setExpanded] = useState(false)

  const used = user.monthly_pdf_count ?? 0
  const pct  = Math.min((used / LIMIT) * 100, 100)

  async function handleUpgrade() {
    setLoading(true)
    setError(null)
    try {
      const { url } = await subscribe(plan, billing)
      window.location.href = url
    } catch {
      setError('Erro ao iniciar assinatura. Tente novamente.')
      setLoading(false)
    }
  }

  return (
    <div className="bg-surface rounded-lg border border-outline-variant p-lg flex flex-col gap-md">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-md">
        <div className="flex-1 min-w-0">
          <p className="text-label-md font-semibold text-on-surface mb-xs">
            Plano Free — {used} de {LIMIT} PDFs usados este mês
          </p>
          <div className="w-full bg-surface-container rounded-full h-1.5 mb-xs">
            <div
              className={`h-1.5 rounded-full transition-all duration-500 ${pct >= 100 ? 'bg-error' : 'bg-primary'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-label-sm text-outline">
            Faça upgrade e processe mais PDFs com prioridade.
          </p>
        </div>

        <button
          onClick={() => setExpanded(e => !e)}
          className="flex-shrink-0 inline-flex items-center gap-sm bg-primary text-on-primary px-md py-sm rounded-full text-label-md font-semibold hover:opacity-90 transition-all"
        >
          Fazer upgrade
        </button>
      </div>

      {expanded && (
        <div className="flex flex-col gap-md border-t border-outline-variant pt-md">
          {/* Seletor de plano */}
          <div className="flex gap-sm">
            {PLANS.map(p => (
              <button
                key={p.plan}
                onClick={() => setPlan(p.plan)}
                className={`flex-1 py-sm px-md rounded-lg border text-label-md font-semibold transition-all ${
                  plan === p.plan
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-outline-variant text-on-surface-variant hover:border-primary/50'
                }`}
              >
                {p.label}
                <span className="block text-label-sm font-normal">
                  R${p.price[billing]}/mês
                </span>
              </button>
            ))}
          </div>

          {/* Seletor de ciclo */}
          <div className="flex gap-xs">
            {CYCLES.map(c => (
              <button
                key={c.key}
                onClick={() => setBilling(c.key)}
                className={`flex-1 py-xs px-sm rounded-full text-label-sm font-semibold border transition-all ${
                  billing === c.key
                    ? 'border-primary bg-primary text-on-primary'
                    : 'border-outline-variant text-on-surface-variant hover:border-primary/50'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {error && <p className="text-label-sm text-error">{error}</p>}

          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-sm bg-primary text-on-primary px-md py-sm rounded-full text-label-md font-semibold hover:opacity-90 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading && <span className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />}
            {loading ? 'Aguarde...' : `Assinar ${PLANS.find(p => p.plan === plan)?.label} ${billing}`}
          </button>
        </div>
      )}
    </div>
  )
}
