import type { User } from '../types'
import DashboardHeader from '../components/layout/DashboardHeader'
import UploadCard from '../components/dashboard/UploadCard'
import JobsCard from '../components/dashboard/JobsCard'
import UpgradeBanner from '../components/dashboard/UpgradeBanner'
import { useJobs } from '../hooks/useJobs'

interface Props {
  user: User
}

export default function Dashboard({ user }: Props) {
  const jobsState = useJobs()

  return (
    <div className="min-h-screen bg-surface-container-low font-sans text-on-surface antialiased">
      <DashboardHeader user={user} serviceOnline={jobsState.connected} />

      <main className="max-w-5xl mx-auto px-margin-mobile md:px-margin-desktop py-lg space-y-gutter">
        {user.plan === 'free' && <UpgradeBanner user={user} />}
        <UploadCard />
        <JobsCard
          jobs={jobsState.data ?? []}
          isFetching={jobsState.isFetching}
          connected={jobsState.connected}
          removeJob={jobsState.removeJob}
        />
      </main>

      <footer className="max-w-5xl mx-auto px-margin-mobile md:px-margin-desktop py-lg text-center">
        <p className="text-label-sm text-outline">Zpply · Conversão de PDFs para Markdown · Powered by Docling</p>
      </footer>
    </div>
  )
}
