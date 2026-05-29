import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchCurrentUser, subscribe } from './lib/api'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import SubscribeSuccess from './pages/SubscribeSuccess'

const SUBSCRIBE_INTENT_KEY = 'zpply_subscribe_intent'

export default function App() {
  const { data: user, isLoading } = useQuery({
    queryKey: ['auth'],
    queryFn: fetchCurrentUser,
    staleTime: Infinity,
  })

  // Processa intent de assinatura pendente após login via OAuth
  useEffect(() => {
    if (!user) return
    const raw = sessionStorage.getItem(SUBSCRIBE_INTENT_KEY)
    if (!raw) return
    sessionStorage.removeItem(SUBSCRIBE_INTENT_KEY)
    try {
      const { plan, billing } = JSON.parse(raw)
      subscribe(plan, billing).then(({ url }) => {
        window.location.href = url
      }).catch(console.error)
    } catch { /* intent malformado, ignora */ }
  }, [user])

  // Rota de sucesso de assinatura (completionUrl do AbacatePay)
  if (window.location.pathname === '/subscribe/success') {
    return <SubscribeSuccess />
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return user ? <Dashboard user={user} /> : <Landing />
}

export { SUBSCRIBE_INTENT_KEY }
