import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { authApi } from '../api/client'
import { Link } from 'react-router-dom'
import { showToast } from '../utils/toast'

export default function Login() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect') || '/'

  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
    whatsapp: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        const res = await authApi.login(form.username.trim(), form.password)
        if (res?.access) {
          localStorage.setItem('token', res.access)
          if (res.refresh) localStorage.setItem('refresh', res.refresh)
          window.dispatchEvent(new CustomEvent('auth-change'))
          showToast(t('auth.loginSuccess'), 'success')
          navigate(redirect, { replace: true })
        } else {
          setError(t('auth.error'))
        }
      } else {
        const payload = {
          username: form.username.trim(),
          email: form.email?.trim() || '',
          password: form.password,
          first_name: form.first_name?.trim() || '',
          last_name: form.last_name?.trim() || '',
          phone: form.phone?.trim() || '',
          whatsapp: form.whatsapp?.trim() || '',
        }
        await authApi.register(payload)
        const res = await authApi.login(form.username.trim(), form.password)
        if (res?.access) {
          localStorage.setItem('token', res.access)
          if (res.refresh) localStorage.setItem('refresh', res.refresh)
          window.dispatchEvent(new CustomEvent('auth-change'))
          showToast(t('auth.signupSuccess'), 'success')
          navigate(redirect, { replace: true })
        } else {
          setError(t('auth.error'))
        }
      }
    } catch (err: unknown) {
      const ax = err as { response?: { data?: unknown; status?: number } }
      const data = ax?.response?.data
      const status = ax?.response?.status
      if (status === 401) {
        setError(t('auth.badCredentials') || 'Invalid username or password.')
      } else if (typeof data === 'object' && data && data !== null) {
        if ('detail' in data && (data as { detail: unknown }).detail) {
          setError(String((data as { detail: unknown }).detail))
        } else {
          const messages: string[] = []
          for (const [k, v] of Object.entries(data)) {
            const val = Array.isArray(v) ? v.join(' ') : String(v)
            if (val) messages.push(`${k}: ${val}`)
          }
          setError(messages.length ? messages.join(' ') : t('auth.error'))
        }
      } else {
        setError(t('auth.error'))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="py-12 max-w-md mx-auto px-4">
      <h1 className="text-2xl font-bold mb-6">
        {mode === 'login' ? t('auth.login') : t('auth.signup')}
      </h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          required
          placeholder={t('auth.username')}
          className="w-full px-4 py-3 rounded-lg border border-gray-300"
          value={form.username}
          onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
        />
        {mode === 'register' && (
          <>
            <input
              type="email"
              placeholder={t('auth.email')}
              className="w-full px-4 py-3 rounded-lg border border-gray-300"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
            <input
              type="text"
              placeholder={t('auth.firstName')}
              className="w-full px-4 py-3 rounded-lg border border-gray-300"
              value={form.first_name}
              onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
            />
            <input
              type="text"
              placeholder={t('auth.lastName')}
              className="w-full px-4 py-3 rounded-lg border border-gray-300"
              value={form.last_name}
              onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
            />
            <input
              type="tel"
              placeholder={t('auth.phone')}
              className="w-full px-4 py-3 rounded-lg border border-gray-300"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
            <input
              type="tel"
              placeholder={t('booking.whatsapp')}
              className="w-full px-4 py-3 rounded-lg border border-gray-300"
              value={form.whatsapp}
              onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))}
            />
          </>
        )}
        <input
          type="password"
          required
          placeholder={t('auth.password')}
          className="w-full px-4 py-3 rounded-lg border border-gray-300"
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
        />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-primary-600 text-white rounded-lg font-medium disabled:opacity-50"
        >
          {loading ? t('auth.loading') : mode === 'login' ? t('auth.submit') : t('auth.submitSignup')}
        </button>
      </form>
      <p className="mt-4 text-center text-gray-600">
        {mode === 'login' ? t('auth.noAccount') : t('auth.hasAccount')}{' '}
        <button
          type="button"
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          className="text-primary-600 font-medium"
        >
          {mode === 'login' ? t('auth.createAccount') : t('auth.login')}
        </button>
      </p>
    </div>
  )
}
