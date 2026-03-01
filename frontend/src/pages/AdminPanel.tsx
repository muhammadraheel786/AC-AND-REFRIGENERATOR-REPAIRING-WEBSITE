import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'

/* ─── Dedicated admin axios instance ──────────────────────────────────────── */
const BACKEND = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL || '')
const http = axios.create({ baseURL: BACKEND, headers: { 'Content-Type': 'application/json' } })
http.interceptors.request.use(cfg => {
    const t = localStorage.getItem('admin_token')
    if (t) cfg.headers.Authorization = `Bearer ${t}`
    return cfg
})

// ─── Types ────────────────────────────────────────────────────────────────────
type Booking = {
    id: number; invoice_number: string; customer_name: string; customer_phone: string
    service_name: string; scheduled_date: string; scheduled_time: string
    status: string; payment_status: string; total_price: string
    address_street: string; address_city: string; notes: string; created_at: string
}
type Service = {
    id: number; name_en: string; name_ar: string; description_en?: string; description_ar?: string
    category: string; base_price: string; duration_hours: number; is_active: boolean
}
type User = {
    id: number; username: string; first_name: string; last_name: string
    email: string; phone: string; role: string; is_active: boolean; date_joined: string
}
type Stats = {
    bookings: { total: number; pending: number; confirmed: number; completed: number }
    users: { total: number }; services: { total: number; active: number }
    recent_bookings: Booking[]
}

// ─── Status helpers ───────────────────────────────────────────────────────────
const STATUS_MAP: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    confirmed: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-purple-100 text-purple-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
}
const PAY_MAP: Record<string, string> = {
    pending: 'bg-orange-100 text-orange-700',
    paid: 'bg-emerald-100 text-emerald-700',
    failed: 'bg-red-100 text-red-700',
    refunded: 'bg-gray-200 text-gray-700',
}
function Badge({ text, map }: { text: string; map: Record<string, string> }) {
    return (
        <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${map[text] || 'bg-gray-200 text-gray-600'}`}>
            {text}
        </span>
    )
}

// ─── Shared UI ────────────────────────────────────────────────────────────────
const inp = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:border-teal-500 outline-none'
const inpWht = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-teal-500 outline-none'

function FL({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
            {children}
        </div>
    )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
    return (
        <div dir="ltr" className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <h3 className="font-bold text-gray-800 text-sm">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 w-8 h-8 flex items-center justify-center text-xl rounded-lg hover:bg-gray-100">×</button>
                </div>
                <div className="p-6">{children}</div>
            </div>
        </div>
    )
}

function ConfirmModal({ msg, onOk, onCancel }: { msg: string; onOk: () => void; onCancel: () => void }) {
    return (
        <div dir="ltr" className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center">
                <div className="text-5xl mb-3">🗑️</div>
                <h3 className="font-bold text-gray-800 mb-2">Confirm Delete</h3>
                <p className="text-gray-500 text-sm mb-6">{msg}</p>
                <div className="flex gap-3 justify-center">
                    <button onClick={onCancel} className="px-5 py-2 rounded-xl border text-gray-600 text-sm hover:bg-gray-50">Cancel</button>
                    <button onClick={onOk} className="px-5 py-2 rounded-xl bg-red-600 text-white text-sm hover:bg-red-700">Delete</button>
                </div>
            </div>
        </div>
    )
}

function Toast({ msg }: { msg: string }) {
    return (
        <div className="fixed top-5 right-5 z-[300] bg-gray-900 border border-gray-700 text-white px-5 py-3 rounded-xl shadow-2xl text-xs font-medium animate-bounce">
            {msg}
        </div>
    )
}

// ─── Login Screen ─────────────────────────────────────────────────────────────
function AdminLogin({ onLogin }: { onLogin: (token: string, user: Record<string, unknown>) => void }) {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const submit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            const r = await axios.post(`${BACKEND}/api/auth/login/`, { username, password })
            const d = r.data
            const token: string = d.access || d.token || ''
            const user = d.user || {}
            const isStaff: boolean = user.is_staff || user.role === 'admin' || false
            if (!isStaff) {
                setError('Access denied. This account is not an admin.')
                return
            }
            localStorage.setItem('admin_token', token)
            onLogin(token, user as Record<string, unknown>)
        } catch (err: unknown) {
            const ax = err as { response?: { data?: { detail?: string; non_field_errors?: string[] } } }
            const msg = ax?.response?.data?.detail
                || ax?.response?.data?.non_field_errors?.[0]
                || 'Invalid username or password'
            setError(msg)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div dir="ltr" className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-teal-500/10 border border-teal-500/20 mb-4">
                        <span className="text-3xl">⚙️</span>
                    </div>
                    <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
                    <p className="text-gray-500 text-sm mt-1">AC & Refrigeration Management</p>
                </div>

                <form onSubmit={submit} className="bg-gray-900 border border-gray-800 rounded-2xl p-8 space-y-4 shadow-2xl">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-xs">
                            {error}
                        </div>
                    )}
                    <FL label="Username">
                        <input
                            type="text" value={username} onChange={e => setUsername(e.target.value)} required
                            placeholder="admin"
                            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-teal-500 outline-none"
                        />
                    </FL>
                    <FL label="Password">
                        <input
                            type="password" value={password} onChange={e => setPassword(e.target.value)} required
                            placeholder="••••••••"
                            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-teal-500 outline-none"
                        />
                    </FL>
                    <button
                        type="submit" disabled={loading}
                        className="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
                    >
                        {loading ? '⏳ Signing in…' : '🔐 Login to Admin Panel'}
                    </button>
                </form>
                <p className="text-center text-gray-700 text-xs mt-4">
                    Default credentials: <span className="text-gray-500">admin / Admin@2026!</span>
                </p>
            </div>
        </div>
    )
}

// ─── MAIN ADMIN PANEL ─────────────────────────────────────────────────────────
export default function AdminPanel() {
    const [token, setToken] = useState<string | null>(() => localStorage.getItem('admin_token'))
    const [adminName, setAdminName] = useState('Admin')
    const [tab, setTab] = useState<'dashboard' | 'bookings' | 'services' | 'users'>('dashboard')
    const [stats, setStats] = useState<Stats | null>(null)
    const [bookings, setBookings] = useState<Booking[]>([])
    const [bTotal, setBTotal] = useState(0)
    const [bPage, setBPage] = useState(1)
    const [bSearch, setBSearch] = useState('')
    const [bStatus, setBStatus] = useState('')
    const [services, setServices] = useState<Service[]>([])
    const [users, setUsers] = useState<User[]>([])
    const [uTotal, setUTotal] = useState(0)
    const [uPage, setUPage] = useState(1)
    const [uSearch, setUSearch] = useState('')
    const [loading, setLoading] = useState(false)
    const [editBooking, setEditBooking] = useState<Booking | null>(null)
    const [editService, setEditService] = useState<Service | null>(null)
    const [editUser, setEditUser] = useState<User | null>(null)
    const [newService, setNewService] = useState(false)
    const [confirmDel, setConfirmDel] = useState<{ type: string; id: number; msg: string } | null>(null)
    const [toast, setToast] = useState('')

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3200) }

    // ── Data loaders ─────────────────────────────────────────────────────────────
    const loadStats = useCallback(async () => {
        try { const r = await http.get('/api/admin/stats/'); setStats(r.data) } catch { /* silent */ }
    }, [])

    const loadBookings = useCallback(async () => {
        setLoading(true)
        try {
            const r = await http.get('/api/admin/bookings/', {
                params: { page: bPage, per_page: 15, search: bSearch, status: bStatus },
            })
            setBookings(r.data.results || [])
            setBTotal(r.data.total || 0)
        } catch { setBookings([]) } finally { setLoading(false) }
    }, [bPage, bSearch, bStatus])

    const loadServices = useCallback(async () => {
        try { const r = await http.get('/api/admin/services/'); setServices(r.data || []) }
        catch { setServices([]) }
    }, [])

    const loadUsers = useCallback(async () => {
        setLoading(true)
        try {
            const r = await http.get('/api/admin/users/', { params: { page: uPage, per_page: 15, search: uSearch } })
            setUsers(r.data.results || [])
            setUTotal(r.data.total || 0)
        } catch { setUsers([]) } finally { setLoading(false) }
    }, [uPage, uSearch])

    useEffect(() => { if (token) loadStats() }, [token, loadStats])
    useEffect(() => { if (token && tab === 'bookings') loadBookings() }, [token, tab, loadBookings])
    useEffect(() => { if (token && tab === 'services') loadServices() }, [token, tab, loadServices])
    useEffect(() => { if (token && tab === 'users') loadUsers() }, [token, tab, loadUsers])

    // ── Actions ───────────────────────────────────────────────────────────────────
    const saveBooking = async (data: Partial<Booking>) => {
        try { await http.put(`/api/admin/bookings/${editBooking!.id}/`, data); showToast('✅ Booking updated'); setEditBooking(null); loadBookings() }
        catch { showToast('❌ Update failed') }
    }
    const deleteBooking = async (id: number) => {
        try { await http.delete(`/api/admin/bookings/${id}/`); showToast('🗑️ Booking deleted'); setConfirmDel(null); loadBookings() }
        catch { showToast('❌ Delete failed') }
    }
    const saveService = async (data: Partial<Service>) => {
        try {
            if (newService) { await http.post('/api/admin/services/', data); showToast('✅ Service created'); setNewService(false) }
            else { await http.put(`/api/admin/services/${editService!.id}/`, data); showToast('✅ Service updated'); setEditService(null) }
            loadServices()
        } catch { showToast('❌ Save failed') }
    }
    const deleteService = async (id: number) => {
        try { await http.delete(`/api/admin/services/${id}/`); showToast('🗑️ Service deleted'); setConfirmDel(null); loadServices() }
        catch { showToast('❌ Delete failed') }
    }
    const saveUser = async (data: Partial<User>) => {
        try { await http.put(`/api/admin/users/${editUser!.id}/`, data); showToast('✅ User updated'); setEditUser(null); loadUsers() }
        catch { showToast('❌ Update failed') }
    }
    const deleteUser = async (id: number) => {
        try { await http.delete(`/api/admin/users/${id}/`); showToast('🗑️ User deleted'); setConfirmDel(null); loadUsers() }
        catch { showToast('❌ Delete failed') }
    }
    const logout = () => { localStorage.removeItem('admin_token'); setToken(null) }

    // ── Not logged in → show login screen ────────────────────────────────────────
    if (!token) {
        return (
            <AdminLogin
                onLogin={(t, u) => {
                    setToken(t)
                    const n = ((u.first_name as string) || '') + ' ' + ((u.last_name as string) || '')
                    setAdminName(n.trim() || (u.username as string) || 'Admin')
                }}
            />
        )
    }

    const TABS = [
        { id: 'dashboard', icon: '📊', label: 'Dashboard' },
        { id: 'bookings', icon: '📋', label: 'Bookings', badge: stats?.bookings.pending },
        { id: 'services', icon: '🔧', label: 'Services' },
        { id: 'users', icon: '👥', label: 'Users' },
    ]

    // IMPORTANT:  dir="ltr" overrides the global RTL set in index.html
    return (
        <div dir="ltr" className="flex min-h-screen bg-gray-950 text-white text-sm" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
            {toast && <Toast msg={toast} />}

            {/* ── Sidebar ── */}
            <aside className="w-60 shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col h-screen sticky top-0">
                {/* Logo */}
                <div className="px-5 py-5 border-b border-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-lg">⚙️</div>
                        <div>
                            <p className="font-bold text-white text-xs">Admin Panel</p>
                            <p className="text-gray-600 text-xs">AC & Refrigeration</p>
                        </div>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                    {TABS.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id as typeof tab)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left ${tab === t.id
                                    ? 'bg-teal-500/15 text-teal-300 border border-teal-500/25'
                                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                                }`}
                        >
                            <span className="text-base w-5 text-center">{t.icon}</span>
                            <span className="flex-1">{t.label}</span>
                            {t.badge !== undefined && t.badge > 0 && (
                                <span className="bg-amber-500 text-white text-[9px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1">
                                    {t.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>

                {/* User + logout */}
                <div className="p-3 border-t border-gray-800 space-y-1">
                    <div className="px-3 py-2 text-xs text-gray-500 truncate">👤 {adminName}</div>
                    <button
                        onClick={logout}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors text-left"
                    >
                        <span>🚪</span> Logout
                    </button>
                    <a
                        href="/"
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-gray-500 hover:text-gray-200 hover:bg-white/5 transition-colors"
                    >
                        <span>🌐</span> Back to Website
                    </a>
                </div>
            </aside>

            {/* ── Main Content ── */}
            <main className="flex-1 overflow-auto">

                {/* Top bar */}
                <div className="sticky top-0 z-30 bg-gray-950/80 backdrop-blur border-b border-gray-800 px-8 py-3 flex items-center justify-between">
                    <h1 className="font-semibold text-gray-200 capitalize">{tab}</h1>
                    <div className="text-xs text-gray-600">{new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</div>
                </div>

                <div className="p-8">

                    {/* ─── DASHBOARD ─── */}
                    {tab === 'dashboard' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                                {[
                                    { label: 'Total Bookings', val: stats?.bookings.total, icon: '📋', bg: 'from-blue-900/30 to-blue-800/10', border: 'border-blue-700/30', clr: 'text-blue-300' },
                                    { label: 'Pending', val: stats?.bookings.pending, icon: '⏳', bg: 'from-amber-900/30 to-amber-800/10', border: 'border-amber-700/30', clr: 'text-amber-300' },
                                    { label: 'Completed', val: stats?.bookings.completed, icon: '✅', bg: 'from-green-900/30 to-green-800/10', border: 'border-green-700/30', clr: 'text-green-300' },
                                    { label: 'Total Users', val: stats?.users.total, icon: '👥', bg: 'from-purple-900/30 to-purple-800/10', border: 'border-purple-700/30', clr: 'text-purple-300' },
                                ].map(s => (
                                    <div key={s.label} className={`bg-gradient-to-br ${s.bg} border ${s.border} rounded-2xl p-5`}>
                                        <div className="text-2xl mb-2">{s.icon}</div>
                                        <div className={`text-3xl font-extrabold ${s.clr}`}>{s.val ?? '—'}</div>
                                        <div className="text-gray-500 text-xs mt-1">{s.label}</div>
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                {[
                                    { label: 'Services Total', val: stats?.services.total, icon: '🔧' },
                                    { label: 'Services Active', val: stats?.services.active, icon: '✅' },
                                    { label: 'Confirmed', val: stats?.bookings.confirmed, icon: '🔵' },
                                ].map(s => (
                                    <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-4">
                                        <span className="text-2xl">{s.icon}</span>
                                        <div>
                                            <p className="text-gray-400 text-xs">{s.label}</p>
                                            <p className="text-xl font-bold text-white">{s.val ?? '—'}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
                                    <h3 className="font-semibold text-gray-100 text-xs uppercase tracking-wider">Recent Bookings</h3>
                                    <button onClick={() => setTab('bookings')} className="text-teal-400 text-xs hover:underline">View all →</button>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead><tr className="border-b border-gray-800 text-gray-500">
                                            {['Invoice', 'Customer', 'Service', 'Date', 'Status', 'Payment'].map(h => (
                                                <th key={h} className="text-left px-4 py-3 font-medium uppercase tracking-wide">{h}</th>
                                            ))}
                                        </tr></thead>
                                        <tbody>
                                            {!(stats?.recent_bookings?.length) && (
                                                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-600">No bookings yet</td></tr>
                                            )}
                                            {(stats?.recent_bookings || []).map(b => (
                                                <tr key={b.id} className="border-b border-gray-800/50 hover:bg-white/[0.02]">
                                                    <td className="px-4 py-3 font-mono text-teal-400">{b.invoice_number || `#${b.id}`}</td>
                                                    <td className="px-4 py-3 text-gray-200">{b.customer_name || '—'}</td>
                                                    <td className="px-4 py-3 text-gray-400 max-w-[130px] truncate">{b.service_name || '—'}</td>
                                                    <td className="px-4 py-3 text-gray-500">{b.scheduled_date}</td>
                                                    <td className="px-4 py-3"><Badge text={b.status} map={STATUS_MAP} /></td>
                                                    <td className="px-4 py-3"><Badge text={b.payment_status} map={PAY_MAP} /></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ─── BOOKINGS ─── */}
                    {tab === 'bookings' && (
                        <div className="space-y-5">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-bold">Bookings <span className="text-gray-500 font-normal">({bTotal})</span></h2>
                                <button onClick={loadBookings} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-xs font-medium transition-colors">🔄 Refresh</button>
                            </div>
                            <div className="flex gap-3 flex-wrap">
                                <input
                                    className={`${inp} flex-1 min-w-[200px]`}
                                    placeholder="Search invoice or address…"
                                    value={bSearch}
                                    onChange={e => { setBSearch(e.target.value); setBPage(1) }}
                                />
                                <select className={`${inp} w-44`} value={bStatus} onChange={e => { setBStatus(e.target.value); setBPage(1) }}>
                                    <option value="">All Statuses</option>
                                    {['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'].map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs min-w-[900px]">
                                        <thead><tr className="border-b border-gray-800 text-gray-500">
                                            {['Invoice', 'Customer', 'Service', 'Date / Time', 'Status', 'Payment', 'Price SAR', 'Actions'].map(h => (
                                                <th key={h} className="text-left px-4 py-3 font-medium uppercase tracking-wide whitespace-nowrap">{h}</th>
                                            ))}
                                        </tr></thead>
                                        <tbody>
                                            {loading && <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-600">Loading…</td></tr>}
                                            {!loading && !bookings.length && <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-600">No bookings found</td></tr>}
                                            {bookings.map(b => (
                                                <tr key={b.id} className="border-b border-gray-800/50 hover:bg-white/[0.025] transition-colors">
                                                    <td className="px-4 py-3 font-mono text-teal-400">{b.invoice_number || `#${b.id}`}</td>
                                                    <td className="px-4 py-3">
                                                        <div className="font-medium text-gray-100">{b.customer_name || '—'}</div>
                                                        <div className="text-gray-500">{b.customer_phone}</div>
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-300 max-w-[120px] truncate">{b.service_name || '—'}</td>
                                                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{b.scheduled_date}<br />{b.scheduled_time}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap"><Badge text={b.status} map={STATUS_MAP} /></td>
                                                    <td className="px-4 py-3 whitespace-nowrap"><Badge text={b.payment_status} map={PAY_MAP} /></td>
                                                    <td className="px-4 py-3 font-semibold text-gray-200">{b.total_price}</td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex gap-1.5">
                                                            <button onClick={() => setEditBooking(b)} className="px-3 py-1.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg font-medium transition-colors">✏️ Edit</button>
                                                            <button onClick={() => setConfirmDel({ type: 'booking', id: b.id, msg: `Delete booking ${b.invoice_number || b.id}?` })} className="px-2.5 py-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors">🗑️</button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <p className="text-gray-500 text-xs">{bookings.length} of {bTotal} shown</p>
                                <div className="flex gap-2">
                                    <button disabled={bPage === 1} onClick={() => setBPage(p => p - 1)} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-xs disabled:opacity-30 transition-colors">← Prev</button>
                                    <span className="px-3 py-2 text-xs text-gray-500">Page {bPage}</span>
                                    <button disabled={bPage * 15 >= bTotal} onClick={() => setBPage(p => p + 1)} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-xs disabled:opacity-30 transition-colors">Next →</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ─── SERVICES ─── */}
                    {tab === 'services' && (
                        <div className="space-y-5">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-bold">Services <span className="text-gray-500 font-normal">({services.length})</span></h2>
                                <button onClick={() => setNewService(true)} className="px-5 py-2 bg-teal-600 hover:bg-teal-700 rounded-xl text-xs font-semibold transition-colors">＋ Add Service</button>
                            </div>
                            {!services.length && <p className="text-gray-600 text-center py-16">No services found</p>}
                            <div className="space-y-3">
                                {services.map(s => (
                                    <div key={s.id} className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-2xl p-5 flex items-center gap-4 transition-colors">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap mb-1.5">
                                                <span className="font-semibold text-gray-100">{s.name_en}</span>
                                                {s.name_ar && <span className="text-gray-500 text-xs" dir="rtl">{s.name_ar}</span>}
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                                    {s.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>
                                            <div className="flex gap-4 text-xs text-gray-500 flex-wrap">
                                                <span>📂 {s.category}</span>
                                                <span>💰 {s.base_price} SAR</span>
                                                <span>⏱️ {s.duration_hours}h</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 shrink-0">
                                            <button onClick={() => setEditService(s)} className="px-4 py-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-xl text-xs font-medium transition-colors">✏️ Edit</button>
                                            <button onClick={() => setConfirmDel({ type: 'service', id: s.id, msg: `Delete "${s.name_en}"?` })} className="px-3 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-xl text-xs transition-colors">🗑️</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ─── USERS ─── */}
                    {tab === 'users' && (
                        <div className="space-y-5">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-bold">Users <span className="text-gray-500 font-normal">({uTotal})</span></h2>
                                <button onClick={loadUsers} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-xs font-medium transition-colors">🔄 Refresh</button>
                            </div>
                            <input
                                className={`${inp} max-w-sm`}
                                placeholder="Search name, phone, email…"
                                value={uSearch}
                                onChange={e => { setUSearch(e.target.value); setUPage(1) }}
                            />
                            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs min-w-[720px]">
                                        <thead><tr className="border-b border-gray-800 text-gray-500">
                                            {['Name', 'Username', 'Phone', 'Email', 'Role', 'Status', 'Joined', 'Actions'].map(h => (
                                                <th key={h} className="text-left px-4 py-3 font-medium uppercase tracking-wide">{h}</th>
                                            ))}
                                        </tr></thead>
                                        <tbody>
                                            {loading && <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-600">Loading…</td></tr>}
                                            {!loading && !users.length && <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-600">No users found</td></tr>}
                                            {users.map(u => (
                                                <tr key={u.id} className="border-b border-gray-800/50 hover:bg-white/[0.025] transition-colors">
                                                    <td className="px-4 py-3 font-medium text-gray-100">{u.first_name} {u.last_name}</td>
                                                    <td className="px-4 py-3 font-mono text-gray-400">{u.username}</td>
                                                    <td className="px-4 py-3 text-gray-400">{u.phone || '—'}</td>
                                                    <td className="px-4 py-3 text-gray-400 max-w-[150px] truncate">{u.email || '—'}</td>
                                                    <td className="px-4 py-3">
                                                        <Badge text={u.role || 'customer'} map={{ admin: 'bg-purple-500/20 text-purple-400', technician: 'bg-blue-500/20 text-blue-400', customer: 'bg-gray-700 text-gray-300' }} />
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        <Badge text={u.is_active ? 'Active' : 'Inactive'} map={{ Active: 'bg-green-500/20 text-green-400', Inactive: 'bg-red-500/20 text-red-400' }} />
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-600">{u.date_joined?.slice(0, 10) || '—'}</td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex gap-1.5">
                                                            <button onClick={() => setEditUser(u)} className="px-3 py-1.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg font-medium transition-colors">✏️</button>
                                                            <button onClick={() => setConfirmDel({ type: 'user', id: u.id, msg: `Delete user "${u.username}"?` })} className="px-2.5 py-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors">🗑️</button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <p className="text-gray-500 text-xs">{users.length} of {uTotal}</p>
                                <div className="flex gap-2">
                                    <button disabled={uPage === 1} onClick={() => setUPage(p => p - 1)} className="px-4 py-2 bg-gray-800 rounded-xl text-xs disabled:opacity-30">← Prev</button>
                                    <span className="px-3 py-2 text-xs text-gray-500">Page {uPage}</span>
                                    <button disabled={uPage * 15 >= uTotal} onClick={() => setUPage(p => p + 1)} className="px-4 py-2 bg-gray-800 rounded-xl text-xs disabled:opacity-30">Next →</button>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </main>

            {/* ── Modals ── */}
            {editBooking && <BookingModal booking={editBooking} onClose={() => setEditBooking(null)} onSave={saveBooking} />}
            {(editService || newService) && (
                <ServiceModal service={editService} onClose={() => { setEditService(null); setNewService(false) }} onSave={saveService} />
            )}
            {editUser && <UserModal user={editUser} onClose={() => setEditUser(null)} onSave={saveUser} />}
            {confirmDel && (
                <ConfirmModal
                    msg={confirmDel.msg}
                    onCancel={() => setConfirmDel(null)}
                    onOk={() => {
                        if (confirmDel.type === 'booking') deleteBooking(confirmDel.id)
                        if (confirmDel.type === 'service') deleteService(confirmDel.id)
                        if (confirmDel.type === 'user') deleteUser(confirmDel.id)
                    }}
                />
            )}
        </div>
    )
}

// ─── BOOKING EDIT MODAL ───────────────────────────────────────────────────────
function BookingModal({ booking, onClose, onSave }: { booking: Booking; onClose: () => void; onSave: (d: Partial<Booking>) => void }) {
    const [f, setF] = useState({ ...booking })
    const s = (k: keyof typeof f, v: string) => setF(p => ({ ...p, [k]: v }))
    return (
        <Modal title={`Edit Booking — ${booking.invoice_number || `#${booking.id}`}`} onClose={onClose}>
            <div className="grid grid-cols-2 gap-4">
                <FL label="Status">
                    <select className={inpWht} value={f.status} onChange={e => s('status', e.target.value)}>
                        {['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'].map(x => <option key={x}>{x}</option>)}
                    </select>
                </FL>
                <FL label="Payment Status">
                    <select className={inpWht} value={f.payment_status} onChange={e => s('payment_status', e.target.value)}>
                        {['pending', 'paid', 'failed', 'refunded'].map(x => <option key={x}>{x}</option>)}
                    </select>
                </FL>
                <FL label="Scheduled Date"><input type="date" className={inpWht} value={f.scheduled_date} onChange={e => s('scheduled_date', e.target.value)} /></FL>
                <FL label="Scheduled Time"><input type="text" className={inpWht} placeholder="09:00" value={f.scheduled_time} onChange={e => s('scheduled_time', e.target.value)} /></FL>
                <div className="col-span-2">
                    <FL label="Street Address"><input type="text" className={inpWht} value={f.address_street} onChange={e => s('address_street', e.target.value)} /></FL>
                </div>
                <FL label="City"><input type="text" className={inpWht} value={f.address_city} onChange={e => s('address_city', e.target.value)} /></FL>
                <FL label="Total Price (SAR)"><input type="number" className={inpWht} value={f.total_price} onChange={e => s('total_price', e.target.value)} /></FL>
                <div className="col-span-2">
                    <FL label="Notes"><textarea rows={3} className={inpWht} value={f.notes} onChange={e => s('notes', e.target.value)} /></FL>
                </div>
            </div>
            <div className="flex gap-3 mt-6 justify-end">
                <button onClick={onClose} className="px-5 py-2 border rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button onClick={() => onSave(f)} className="px-5 py-2 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700">Save Changes</button>
            </div>
        </Modal>
    )
}

// ─── SERVICE EDIT MODAL ───────────────────────────────────────────────────────
function ServiceModal({ service, onClose, onSave }: { service: Service | null; onClose: () => void; onSave: (d: Partial<Service>) => void }) {
    const [f, setF] = useState<Partial<Service>>(service ?? { is_active: true, category: 'ac', duration_hours: 1 })
    const s = (k: string, v: unknown) => setF(p => ({ ...p, [k]: v }))
    return (
        <Modal title={service ? `Edit Service — ${service.name_en}` : 'Add New Service'} onClose={onClose}>
            <div className="grid grid-cols-2 gap-4">
                <FL label="Name (English)"><input type="text" className={inpWht} value={f.name_en || ''} onChange={e => s('name_en', e.target.value)} /></FL>
                <FL label="Name (Arabic)">
                    <input type="text" dir="rtl" className={inpWht + ' text-right'} value={f.name_ar || ''} onChange={e => s('name_ar', e.target.value)} />
                </FL>
                <FL label="Category">
                    <select className={inpWht} value={f.category || 'ac'} onChange={e => s('category', e.target.value)}>
                        {['ac', 'refrigerator', 'washing_machine', 'oven', 'cold_storage'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </FL>
                <FL label="Base Price (SAR)"><input type="number" className={inpWht} value={f.base_price || ''} onChange={e => s('base_price', e.target.value)} /></FL>
                <FL label="Duration (hours)"><input type="number" step="0.5" min="0.5" className={inpWht} value={f.duration_hours || 1} onChange={e => s('duration_hours', parseFloat(e.target.value))} /></FL>
                <div className="flex items-center gap-2 pt-5">
                    <input type="checkbox" id="svc_active" checked={!!f.is_active} onChange={e => s('is_active', e.target.checked)} className="w-4 h-4 accent-teal-600 rounded" />
                    <label htmlFor="svc_active" className="text-sm text-gray-600 cursor-pointer">Active (visible to customers)</label>
                </div>
                <div className="col-span-2">
                    <FL label="Description (English)"><textarea rows={2} className={inpWht} value={f.description_en || ''} onChange={e => s('description_en', e.target.value)} /></FL>
                </div>
                <div className="col-span-2">
                    <FL label="Description (Arabic)"><textarea rows={2} dir="rtl" className={inpWht + ' text-right'} value={f.description_ar || ''} onChange={e => s('description_ar', e.target.value)} /></FL>
                </div>
            </div>
            <div className="flex gap-3 mt-6 justify-end">
                <button onClick={onClose} className="px-5 py-2 border rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button onClick={() => onSave(f)} className="px-5 py-2 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700">
                    {service ? 'Save Changes' : 'Create Service'}
                </button>
            </div>
        </Modal>
    )
}

// ─── USER EDIT MODAL ──────────────────────────────────────────────────────────
function UserModal({ user, onClose, onSave }: { user: User; onClose: () => void; onSave: (d: Partial<User>) => void }) {
    const [f, setF] = useState({ ...user })
    const s = (k: keyof typeof f, v: unknown) => setF(p => ({ ...p, [k]: v }))
    return (
        <Modal title={`Edit User — ${user.username}`} onClose={onClose}>
            <div className="grid grid-cols-2 gap-4">
                <FL label="First Name"><input type="text" className={inpWht} value={f.first_name} onChange={e => s('first_name', e.target.value)} /></FL>
                <FL label="Last Name"><input type="text" className={inpWht} value={f.last_name} onChange={e => s('last_name', e.target.value)} /></FL>
                <FL label="Email"><input type="email" className={inpWht} value={f.email} onChange={e => s('email', e.target.value)} /></FL>
                <FL label="Phone"><input type="tel" className={inpWht} value={f.phone} onChange={e => s('phone', e.target.value)} /></FL>
                <FL label="Role">
                    <select className={inpWht} value={f.role || 'customer'} onChange={e => s('role', e.target.value)}>
                        <option value="customer">Customer</option>
                        <option value="technician">Technician</option>
                        <option value="admin">Admin</option>
                    </select>
                </FL>
                <div className="flex items-center gap-2 pt-5">
                    <input type="checkbox" id="usr_active" checked={!!f.is_active} onChange={e => s('is_active', e.target.checked)} className="w-4 h-4 accent-teal-600 rounded" />
                    <label htmlFor="usr_active" className="text-sm text-gray-600 cursor-pointer">Active Account</label>
                </div>
            </div>
            <div className="flex gap-3 mt-6 justify-end">
                <button onClick={onClose} className="px-5 py-2 border rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button onClick={() => onSave(f)} className="px-5 py-2 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700">Save Changes</button>
            </div>
        </Modal>
    )
}
