'use client'

import { useEffect, useState } from 'react'
import { Wifi, WifiOff, RefreshCw } from 'lucide-react'
import { api } from '@/lib/api'
import { offlineList, syncPending } from '@/lib/offline-cache'
import toast from 'react-hot-toast'

export function OfflineIndicator() {
  const [online, setOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const [pendingCount, setPendingCount] = useState(0)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true)
      // Auto-sync ao reconectar
      autoSync()
    }
    const handleOffline = () => setOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Check pending no mount
    checkPending()
    const interval = setInterval(checkPending, 30000) // a cada 30s

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(interval)
    }
  }, [])

  async function checkPending() {
    const pending = await offlineList('pendingSync')
    setPendingCount(pending.length)
  }

  async function autoSync() {
    if (syncing) return
    const pending = await offlineList('pendingSync')
    if (pending.length === 0) return

    setSyncing(true)
    try {
      const { synced, failed } = await syncPending({
        request: (opts) => api.request(opts),
      })
      if (synced > 0) toast.success(`${synced} ações sincronizadas`)
      if (failed > 0) toast.error(`${failed} ações falharam`)
      checkPending()
    } finally {
      setSyncing(false)
    }
  }

  if (online && pendingCount === 0) return null

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${online ? 'bg-blue-500' : 'bg-yellow-500'} text-white px-3 py-2 rounded-xl shadow-lg flex items-center gap-2 text-xs font-bold`}>
      {!online ? (
        <>
          <WifiOff className="w-4 h-4" />
          <span>Modo offline</span>
          {pendingCount > 0 && <span className="bg-white text-yellow-700 px-1.5 py-0.5 rounded text-[10px]">{pendingCount} aguardando</span>}
        </>
      ) : pendingCount > 0 ? (
        <>
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          <span>{pendingCount} pendentes</span>
          <button onClick={autoSync} disabled={syncing} className="ml-1 underline">
            sincronizar
          </button>
        </>
      ) : null}
    </div>
  )
}
