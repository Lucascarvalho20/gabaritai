/**
 * Cache offline simples via IndexedDB pra:
 *  - Simulado em andamento (questões + respostas em progresso)
 *  - Flashcards baixados pra revisar offline
 *  - Resumos baixados
 *
 * Quando reconecta, sync envia pendências pro servidor.
 *
 * API simples (key-value).
 */

const DB_NAME = 'gabaritai-offline'
const DB_VERSION = 1
const STORES = {
  simulado: 'simulado-progress',
  flashcards: 'flashcards-pool',
  resumos: 'resumos-pool',
  pendingSync: 'pending-sync',
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      reject(new Error('IndexedDB não disponível'))
      return
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      Object.values(STORES).forEach((store) => {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: 'id' })
        }
      })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function offlinePut(store: keyof typeof STORES, id: string, data: any): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORES[store], 'readwrite')
    tx.objectStore(STORES[store]).put({ id, data, savedAt: Date.now() })
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch (err) {
    console.warn('[offline] put error:', err)
  }
}

export async function offlineGet<T = any>(store: keyof typeof STORES, id: string): Promise<T | null> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORES[store], 'readonly')
    const obj = await new Promise<any>((resolve, reject) => {
      const req = tx.objectStore(STORES[store]).get(id)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    return obj?.data ?? null
  } catch (err) {
    console.warn('[offline] get error:', err)
    return null
  }
}

export async function offlineList(store: keyof typeof STORES): Promise<Array<{ id: string; data: any; savedAt: number }>> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORES[store], 'readonly')
    return await new Promise((resolve, reject) => {
      const req = tx.objectStore(STORES[store]).getAll()
      req.onsuccess = () => resolve(req.result ?? [])
      req.onerror = () => reject(req.error)
    })
  } catch {
    return []
  }
}

export async function offlineDelete(store: keyof typeof STORES, id: string): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORES[store], 'readwrite')
    tx.objectStore(STORES[store]).delete(id)
  } catch {}
}

/**
 * Marca uma ação como pendente de sincronização (envio offline).
 */
export async function queuePendingSync(action: {
  endpoint: string
  method: 'POST' | 'PATCH' | 'PUT'
  body: any
  description: string
}): Promise<void> {
  const id = `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`
  await offlinePut('pendingSync', id, action)
}

/**
 * Tenta sincronizar todas ações pendentes. Chama ao reconectar.
 */
export async function syncPending(api: { request: (opts: any) => Promise<any> }): Promise<{ synced: number; failed: number }> {
  const pending = await offlineList('pendingSync')
  let synced = 0
  let failed = 0
  for (const item of pending) {
    try {
      await api.request({
        url: item.data.endpoint,
        method: item.data.method,
        data: item.data.body,
      })
      await offlineDelete('pendingSync', item.id)
      synced++
    } catch {
      failed++
    }
  }
  return { synced, failed }
}

/**
 * Detector simples de status online/offline.
 */
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true
}
