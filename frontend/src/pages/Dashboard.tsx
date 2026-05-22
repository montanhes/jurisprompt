import { useEffect, useState } from 'react'
import type { User } from '../types'
import DashboardHeader from '../components/layout/DashboardHeader'
import UploadCard from '../components/dashboard/UploadCard'
import JobsCard from '../components/dashboard/JobsCard'

interface Props {
  user: User
}

export default function Dashboard({ user }: Props) {
  const [serviceOnline, setServiceOnline] = useState(false)

  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch('/jobs')
        setServiceOnline(res.ok)
      } catch {
        setServiceOnline(false)
      }
    }
    checkHealth()
    const interval = setInterval(checkHealth, 15000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-surface-container-low font-sans text-on-surface antialiased">
      <DashboardHeader user={user} serviceOnline={serviceOnline} />

      <main className="max-w-5xl mx-auto px-margin-mobile md:px-margin-desktop py-lg space-y-gutter">
        <UploadCard />
        <JobsCard />
      </main>

      <footer className="max-w-5xl mx-auto px-margin-mobile md:px-margin-desktop py-lg text-center">
        <p className="text-label-sm text-outline">Zpply · Conversão de PDFs para Markdown · Powered by Docling</p>
      </footer>
    </div>
  )
}
