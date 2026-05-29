import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchJobs, deleteJob } from '../lib/api'
import { useToast } from './useToast'
import type { Job } from '../types'

export function useJobs() {
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const prevJobsRef = useRef<Job[]>([])
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const es = new EventSource('/jobs/stream')

    es.onopen = () => setConnected(true)

    es.onmessage = (e) => {
      const jobs: Job[] = JSON.parse(e.data)
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
      queryClient.setQueryData(['jobs'], jobs)
    }

    es.onerror = () => setConnected(false)

    return () => {
      es.close()
      setConnected(false)
    }
  }, [queryClient, showToast])

  const query = useQuery({
    queryKey: ['jobs'],
    queryFn: fetchJobs,
    staleTime: Infinity,
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

  return { ...query, removeJob, connected }
}
