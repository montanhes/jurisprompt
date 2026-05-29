export type Plan = 'free' | 'pro' | 'premium'
export type BillingCycle = 'mensal' | 'trimestral' | 'anual'
export type PlanStatus = 'active' | 'cancelled' | 'trial'

export interface User {
  id: string
  email: string
  name: string
  picture?: string
  plan: Plan
  plan_billing: BillingCycle | null
  plan_status: PlanStatus
  monthly_pdf_count: number
}

export type JobStatus = 'pending' | 'processing' | 'done' | 'error'

export interface Job {
  id: string
  originalName: string
  status: JobStatus
  resultFile?: string
  error?: string
  createdAt: string
  completedAt?: string
}

export type ToastType = 'success' | 'error' | 'info'

export interface Toast {
  id: number
  message: string
  type: ToastType
}
