export interface User {
  id: string
  email: string
  name: string
  picture?: string
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
