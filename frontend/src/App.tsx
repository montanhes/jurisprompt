import { useQuery } from '@tanstack/react-query'
import { fetchCurrentUser } from './lib/api'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'

export default function App() {
  const { data: user, isLoading } = useQuery({
    queryKey: ['auth'],
    queryFn: fetchCurrentUser,
    staleTime: Infinity,
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return user ? <Dashboard user={user} /> : <Landing />
}
