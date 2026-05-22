import { useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchJobs, deleteJob } from '../lib/api'
import { useToast } from './useToast'
import type { Job } from '../types'

export function useJobs() {
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const prevJobsRef = useRef<Job[]>([])

  const query = useQuery({
    queryKey: ['jobs'],
    queryFn: async () => {
      const jobs = await fetchJobs()
      const prev = prevJobsRef.current
      if (prev.length > 0) {
        jobs.forEach(job => {
          if (job.status === 'done') {
            const prevJob = prev.find(p => p.id === job.id)
            if (prevJob && prevJob.status !== 'done') {
              showToast(`"${job.originalName}" processado com sucesso!`, 'success')
            }
          }
        })
      }
      prevJobsRef.current = jobs
      return jobs
    },
    refetchInterval: 3000,
  })

  async function removeJob(id: string) {
    if (!window.confirm('Remover este arquivo permanentemente?')) return
    try {
      await deleteJob(id)
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    } catch (err) {
      showToast('Erro ao remover: ' + (err instanceof Error ? err.message : 'Erro desconhecido'), 'error')
    }
  }

  return { ...query, removeJob }
}
