import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type UserRole = 'ADMIN' | 'STUDENT'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  avatar?: string
  plan?: 'FREE' | 'BASIC' | 'PREMIUM' | 'LIFETIME'
  concursoAlvo?: string
  createdAt?: string
}

interface AuthState {
  user: User | null
  token: string | null
  setUser: (user: User) => void
  setToken: (token: string) => void
  logout: () => void
  isAdmin: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      logout: () => {
        localStorage.removeItem('gabaritai_token')
        set({ user: null, token: null })
      },
      isAdmin: () => get().user?.role === 'ADMIN',
    }),
    {
      name: 'gabaritai-auth',
      partialize: (state) => ({ user: state.user }),
    }
  )
)
