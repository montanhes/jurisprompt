import type { Job, User } from '../types'

export async function fetchCurrentUser(): Promise<User | null> {
  const res = await fetch('/auth/me')
  if (res.status === 401) return null
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function fetchJobs(): Promise<Job[]> {
  const res = await fetch('/jobs')
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function deleteJob(id: string): Promise<void> {
  const res = await fetch(`/jobs/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}

export async function fetchResult(filename: string): Promise<string> {
  const res = await fetch(`/results/${filename}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.text()
}
