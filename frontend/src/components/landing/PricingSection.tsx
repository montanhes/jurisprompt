import { useState } from 'react'
import GoogleIcon from '../ui/GoogleIcon'
import { SUBSCRIBE_INTENT_KEY } from '../../App'

type Billing = 'mensal' | 'trimestral' | 'anual'

const BILLING_OPTIONS: { key: Billing; label: string; badge?: string }[] = [
  { key: 'mensal',      label: 'Mensal' },
  { key: 'trimestral',  label: 'Trimestral', badge: '13% off' },
  { key: 'anual',       label: 'Anual',      badge: '3 meses grátis' },
]

interface PlanPrice {
  monthly: number
  billed?: string
  savings?: string
}

const PRICES: Record<'pro' | 'premium', Record<Billing, PlanPrice>> = {
  pro: {
    mensal:     { monthly: 79 },
    trimestral: { monthly: 69, billed: 'R$207 a cada 3 meses', savings: 'Economia de R$30' },
    anual:      { monthly: 59, billed: 'R$708 por ano',         savings: '3 meses grátis' },
  },
  premium: {
    mensal:     { monthly: 299 },
    trimestral: { monthly: 264, billed: 'R$792 a cada 3 meses', savings: 'Economia de R$105' },
    anual:      { monthly: 249, billed: 'R$2.988 por ano',       savings: '2 meses grátis' },
  },
}

const CHECK = (
  <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
  </svg>
)

const CROSS = (
  <svg className="w-4 h-4 text-outline flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
)

function Feature({ label, included = true }: { label: string; included?: boolean }) {
  return (
    <li className="flex items-center gap-sm">
      {included ? CHECK : CROSS}
      <span className={`text-body-md ${included ? 'text-on-surface' : 'text-outline'}`}>{label}</span>
    </li>
  )
}

export default function PricingSection() {
  const [billing, setBilling] = useState<Billing>('mensal')

  function handleSubscribe(plan: 'pro' | 'premium', billing: Billing) {
    sessionStorage.setItem(SUBSCRIBE_INTENT_KEY, JSON.stringify({ plan, billing }))
    window.location.href = '/auth/google'
  }

  const pro     = PRICES.pro[billing]
  const premium = PRICES.premium[billing]

  return (
    <section id="pricing" className="py-xl px-margin-mobile md:px-margin-desktop bg-surface-container-low border-t border-outline-variant">
      <div className="max-w-[1120px] mx-auto">

        {/* Header */}
        <div className="text-center mb-xl">
          <h2 className="font-sans font-bold text-headline-lg text-primary mb-base">Planos e Preços</h2>
          <p className="text-body-lg text-on-surface-variant max-w-xl mx-auto">
            Comece grátis e escale conforme sua demanda. Sem taxa de setup, cancele quando quiser.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="flex justify-center mb-xl">
          <div className="inline-flex items-center bg-surface border border-outline-variant rounded-full p-xs gap-xs">
            {BILLING_OPTIONS.map(({ key, label, badge }) => (
              <button
                key={key}
                onClick={() => setBilling(key)}
                className={`relative px-md py-sm rounded-full text-label-md font-semibold transition-all duration-200 ${
                  billing === key
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {label}
                {badge && billing !== key && (
                  <span className="absolute -top-2 -right-1 bg-secondary text-on-secondary text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none whitespace-nowrap">
                    {badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter items-stretch">

          {/* Free */}
          <div className="bg-surface rounded-lg border border-outline-variant p-xl flex flex-col gap-lg">
            <div>
              <p className="text-label-md text-outline font-semibold uppercase tracking-wider mb-base">Free</p>
              <div className="flex items-baseline gap-xs mb-xs">
                <span className="font-sans font-extrabold text-display-lg text-on-surface">R$0</span>
                <span className="text-label-md text-outline">/mês</span>
              </div>
              <p className="text-label-sm text-outline">Para experimentar a conversão</p>
            </div>

            <a
              href="/auth/google"
              className="w-full inline-flex items-center justify-center gap-sm border border-primary text-primary bg-transparent px-md py-sm rounded-full text-label-md font-semibold hover:bg-surface-container-low transition-all"
            >
              <GoogleIcon className="w-4 h-4" />
              Começar grátis
            </a>

            <ul className="flex flex-col gap-sm">
              <Feature label="5 PDFs por mês" />
              <Feature label="Até 30 páginas por arquivo" />
              <Feature label="Até 10 MB por arquivo" />
              <Feature label="Processamento normal" />
              <Feature label="Suporte" included={false} />
            </ul>
          </div>

          {/* Pro — destaque */}
          <div className="relative bg-surface rounded-lg border-2 border-primary p-xl flex flex-col gap-lg shadow-lg">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-primary text-on-primary text-label-sm font-bold px-md py-xs rounded-full whitespace-nowrap shadow-sm">
                Mais popular
              </span>
            </div>

            <div>
              <p className="text-label-md text-primary font-semibold uppercase tracking-wider mb-base">Pro</p>
              <div className="flex items-baseline gap-xs mb-xs">
                <span className="font-sans font-extrabold text-display-lg text-primary">
                  R${pro.monthly}
                </span>
                <span className="text-label-md text-on-surface-variant">/mês</span>
              </div>
              {pro.billed ? (
                <div className="flex flex-col gap-xs">
                  <p className="text-label-sm text-on-surface-variant">{pro.billed}</p>
                  <p className="text-label-sm text-primary font-bold">{pro.savings}</p>
                </div>
              ) : (
                <p className="text-label-sm text-outline">Para profissionais autônomos</p>
              )}
            </div>

            <button
              onClick={() => handleSubscribe('pro', billing)}
              className="w-full inline-flex items-center justify-center gap-sm border border-primary text-primary bg-transparent px-md py-sm rounded-full text-label-md font-semibold hover:bg-surface-container-low transition-all"
            >
              <GoogleIcon className="w-4 h-4" />
              Assinar Pro
            </button>

            <ul className="flex flex-col gap-sm">
              <Feature label="100 PDFs por mês" />
              <Feature label="Até 200 páginas por arquivo" />
              <Feature label="Até 50 MB por arquivo" />
              <Feature label="Processamento prioritário" />
              <Feature label="Suporte por e-mail" />
            </ul>
          </div>

          {/* Premium */}
          <div className="bg-surface rounded-lg border border-outline-variant p-xl flex flex-col gap-lg">
            {billing === 'anual' && (
              <div className="absolute" />
            )}

            <div>
              <p className="text-label-md text-outline font-semibold uppercase tracking-wider mb-base">Premium</p>
              <div className="flex items-baseline gap-xs mb-xs">
                <span className="font-sans font-extrabold text-display-lg text-on-surface">
                  R${premium.monthly}
                </span>
                <span className="text-label-md text-outline">/mês</span>
              </div>
              {premium.billed ? (
                <div className="flex flex-col gap-xs">
                  <p className="text-label-sm text-on-surface-variant">{premium.billed}</p>
                  <p className="text-label-sm text-primary font-bold">{premium.savings}</p>
                </div>
              ) : (
                <p className="text-label-sm text-outline">Para equipes e escritórios</p>
              )}
            </div>

            <button
              onClick={() => handleSubscribe('premium', billing)}
              className="w-full inline-flex items-center justify-center gap-sm border border-primary text-primary bg-transparent px-md py-sm rounded-full text-label-md font-semibold hover:bg-surface-container-low transition-all"
            >
              <GoogleIcon className="w-4 h-4" />
              Assinar Premium
            </button>

            <ul className="flex flex-col gap-sm">
              <Feature label="PDFs ilimitados (100k páginas/mês)" />
              <Feature label="Até 500 páginas por arquivo" />
              <Feature label="Até 100 MB por arquivo" />
              <Feature label="Processamento prioritário" />
              <Feature label="Suporte por e-mail e chat" />
            </ul>
          </div>

        </div>

        {/* Footer note */}
        <p className="text-center text-label-sm text-outline mt-xl">
          Todos os planos pagos incluem 7 dias de teste grátis · Cancele a qualquer momento · Sem multa
        </p>

      </div>
    </section>
  )
}
