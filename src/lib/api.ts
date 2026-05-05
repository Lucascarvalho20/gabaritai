import axios from 'axios'

// Em desenvolvimento, usa as rotas da própria Next.js (/api/...)
// Em produção pode apontar para backend externo se quiser
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use(config => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('gabaritai_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('gabaritai_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)
