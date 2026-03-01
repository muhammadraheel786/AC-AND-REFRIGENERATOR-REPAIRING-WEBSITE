import { ReactNode, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Phone, Menu, X, LogOut } from 'lucide-react'
import LanguageSwitcher from './LanguageSwitcher'
import { api } from '../api/client'

export default function Layout({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'))
  const [site, setSite] = useState<{ company_name_ar?: string; company_name_en?: string; phone?: string } | null>(null)
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type: 'success' | 'error' | 'info' }>>([])

  useEffect(() => {
    const updateAuth = () => setIsLoggedIn(!!localStorage.getItem('token'))
    updateAuth()
    api.get('/api/auth/settings/').then((r) => setSite(r.data)).catch(() => { })
    const onToast = (event: Event) => {
      const custom = event as CustomEvent<{ message: string; type?: 'success' | 'error' | 'info' }>
      const message = custom.detail?.message
      if (!message) return
      const toast = { id: Date.now() + Math.floor(Math.random() * 1000), message, type: custom.detail?.type || 'info' }
      setToasts((prev) => [...prev, toast])
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id))
      }, 3500)
    }
    window.addEventListener('auth-change', updateAuth)
    window.addEventListener('app-toast', onToast as EventListener)
    return () => {
      window.removeEventListener('auth-change', updateAuth)
      window.removeEventListener('app-toast', onToast as EventListener)
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    setIsLoggedIn(false)
    window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: t('auth.logoutSuccess'), type: 'success' } }))
    window.location.href = '/'
  }

  const navItems = [
    { to: '/', label: t('nav.home') },
    { to: '/services', label: t('nav.services') },
    { to: '/book', label: t('nav.book') },
    { to: '/contact', label: t('nav.contact') },
  ]

  const phone = site?.phone || '0582618038'

  return (
    <div className="min-h-screen flex flex-col">
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[92%] max-w-md space-y-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-lg px-4 py-3 shadow-lg border text-sm ${toast.type === 'success'
              ? 'bg-green-50 text-green-800 border-green-200'
              : toast.type === 'error'
                ? 'bg-red-50 text-red-800 border-red-200'
                : 'bg-blue-50 text-blue-800 border-blue-200'
              }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
      <header className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 md:h-20">
            <Link to="/" className="flex items-center gap-2">
              <span className="text-2xl font-bold text-primary-600">{site?.company_name_ar || t('hero.title')}</span>
              <span className="text-sm text-gray-500 hidden sm:inline">| {site?.company_name_en || 'A/C & Refrigeration'}</span>
            </Link>

            <nav className="hidden md:flex items-center gap-6">
              {navItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="text-gray-700 hover:text-primary-600 font-medium transition"
                >
                  {item.label}
                </Link>
              ))}
              {isLoggedIn && <Link to="/my-bookings" className="text-gray-700 hover:text-primary-600 font-medium">{t('nav.myBookings')}</Link>}
              <LanguageSwitcher />
              {isLoggedIn ? (
                <button onClick={handleLogout} className="flex items-center gap-1 text-gray-700 hover:text-red-600">
                  <LogOut size={18} />
                  {t('nav.logout')}
                </button>
              ) : (
                <Link to="/login" className="flex items-center gap-1 bg-primary-600 text-white px-4 py-2 rounded-full hover:bg-primary-700">
                  {t('nav.login')}
                </Link>
              )}
              <a href={`tel:${phone}`} className="flex items-center gap-1 bg-primary-600 text-white px-4 py-2 rounded-full hover:bg-primary-700 transition">
                <Phone size={18} />
                {t('contact.call')}
              </a>
            </nav>

            <button
              className="md:hidden p-2 rounded-md hover:bg-gray-100 transition"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown — sits BELOW the header bar, outside the header's inner container */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
            <nav className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-3 rounded-lg text-gray-700 font-medium hover:bg-gray-50 hover:text-primary-600 transition"
                >
                  {item.label}
                </Link>
              ))}
              {isLoggedIn && (
                <Link
                  to="/my-bookings"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-3 rounded-lg text-gray-700 font-medium hover:bg-gray-50 hover:text-primary-600 transition"
                >
                  {t('nav.myBookings')}
                </Link>
              )}
              <div className="px-3 py-2">
                <LanguageSwitcher />
              </div>
              <div className="border-t border-gray-100 mt-1 pt-2 flex flex-col gap-1">
                {isLoggedIn ? (
                  <button
                    onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                    className="flex items-center gap-2 px-3 py-3 rounded-lg text-red-600 hover:bg-red-50 transition font-medium"
                  >
                    <LogOut size={18} />
                    {t('nav.logout')}
                  </button>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-3 rounded-lg bg-primary-600 text-white font-medium text-center hover:bg-primary-700 transition"
                  >
                    {t('nav.login')}
                  </Link>
                )}
                <a
                  href={`tel:${phone}`}
                  className="flex items-center gap-2 px-3 py-3 rounded-lg text-primary-600 font-medium hover:bg-primary-50 transition"
                >
                  <Phone size={18} />
                  {t('contact.call')} {phone}
                </a>
              </div>
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="bg-gray-900 text-white py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="font-bold text-lg">{site?.company_name_ar || 'التكيف التبريد'} | {site?.company_name_en || 'A/C & Refrigeration'}</p>
          <p className="text-gray-400 mt-1">{site?.address_en || 'Al-Dieya - Dammam, Kingdom of Saudi Arabia'}</p>
          <a href={`tel:${phone}`} className="inline-block mt-2 text-primary-300 hover:text-white">
            {phone}
          </a>
          <p className="mt-4 text-sm text-gray-500 flex items-center justify-center gap-3 flex-wrap">
            <span>{site?.footer_text_ar || t('footer.rights')}</span>
            <Link
              to="/admin-panel"
              className="inline-flex items-center gap-1.5 text-gray-500 hover:text-teal-400 transition-colors"
              title="Admin Panel"
            >
              <span>⚙️</span>
              <span className="text-xs">لوحة التحكم</span>
            </Link>
          </p>
        </div>
      </footer>
    </div>
  )
}
