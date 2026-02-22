import axios from 'axios'

// In dev: empty = use Vite proxy (/api -> backend). In prod: set VITE_API_URL to your API base.
const API_URL = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL || '')

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (r) => r,
  (err) => {
    // Don't redirect on 401 from auth endpoints (wrong password, etc.)
    const isAuthEndpoint = err.config?.url?.includes('/auth/login') || err.config?.url?.includes('/auth/register')
    if (err.response?.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// Handle DRF paginated response: { results: [] } or plain list; always return an array
const asList = (r: { data: unknown }): unknown[] => {
  const d = r.data
  if (Array.isArray(d)) return d
  const results = (d as { results?: unknown[] } | null)?.results
  return Array.isArray(results) ? results : []
}

export const servicesApi = {
  list: (params?: { category?: string; lang?: string }) =>
    api.get('/api/services/', { params }).then((r) => asList(r)),
  get: (id: number) => api.get(`/api/services/${id}/`).then((r) => r.data),
}

export const bookingsApi = {
  create: (data: Record<string, unknown>) => api.post('/api/bookings/', data).then((r) => r.data),
  createGuest: (data: Record<string, unknown>) =>
    api.post('/api/bookings/guest/', data).then((r) => r.data),
  list: () => api.get('/api/bookings/').then((r) => asList(r)),
  get: (id: number) => api.get(`/api/bookings/${id}/`).then((r) => r.data),
  invoice: (id: number) =>
    api.get(`/api/bookings/${id}/invoice/`, { responseType: 'blob' }).then((r) => r.data),
}

export const paymentsApi = {
  initiate: (bookingId: number, returnUrl: string, callbackUrl: string, lang = 'ar', gateway = 'paytabs') =>
    api.post('/api/payments/initiate/', {
      booking_id: bookingId,
      return_url: returnUrl,
      callback_url: callbackUrl,
      lang,
      gateway,
    }).then((r) => r.data),
}

export const authApi = {
  login: (username: string, password: string) =>
    api.post('/api/auth/login/', { username, password }).then((r) => r.data),
  register: (data: Record<string, string>) =>
    api.post('/api/auth/register/', data).then((r) => r.data),
  profile: () => api.get('/api/auth/profile/').then((r) => r.data),
}
