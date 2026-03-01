import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'

/* ─── Admin-only Axios instance ─────────────────────────────────────────────
   Uses a SEPARATE token key "admin_token" so it never clashes with
   the public-site user token. No react-router dependency at all.           */
const BACKEND = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL || '')
const http = axios.create({ baseURL: BACKEND, headers: { 'Content-Type': 'application/json' } })
http.interceptors.request.use(cfg => {
    const t = localStorage.getItem('admin_token')
    if (t) cfg.headers.Authorization = `Bearer ${t}`
    return cfg
})

// ─── Types ───────────────────────────────────────────────────────────────────
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

// ─── Helpers ─────────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    confirmed: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-purple-100 text-purple-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
}
const PAY_COLORS: Record<string, string> = {
    pending: 'bg-orange-100 text-orange-700',
    paid: 'bg-emerald-100 text-emerald-700',
    failed: 'bg-red-100 text-red-700',
    refunded: 'bg-gray-100 text-gray-700',
}

// ─── Shared UI components ─────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
            {children}
        </div>
    )
}
const inp = "w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-teal-500 focus:outline-none"
const inpLight = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"

function Badge({ label, colorMap }: { label: string; colorMap: Record<string, string> }) {
    const cls = colorMap[label] || 'bg-gray-200 text-gray-700'
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${cls}`}>{label}</span>
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <h3 className="font-bold text-gray-800">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">×</button>
                </div>
                <div className="p-6">{children}</div>
            </div>
        </div>
    )
}

function ConfirmModal({ msg, onOk, onCancel }: { msg: string; onOk: () => void; onCancel: () => void }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center">
                <div className="text-5xl mb-4">🗑️</div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">Are you sure?</h3>
                <p className="text-gray-500 mb-6 text-sm">{msg}</p>
                <div className="flex gap-3 justify-center">
                    <button onClick={onCancel} className="px-6 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm">Cancel</button>
                    <button onClick={onOk} className="px-6 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 text-sm font-medium">Delete</button>
                </div>
            </div>
        </div>
    )
}

// ─── Login Screen ─────────────────────────────────────────────────────────────
function AdminLogin({ onLogin }: { onLogin: (token: string) => void }) {
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
            const data = r.data
            const token = data.access || data.token || ''
            const isStaff = data.user?.is_staff || data.user?.role === 'admin' || false
            if (!isStaff) { setError('Access denied. Admin accounts only.'); return }
            localStorage.setItem('admin_token', token)
            onLogin(token)
        } catch (err: unknown) {
            const e = err as { response?: { data?: { detail?: string } } }
            setError(e?.response?.data?.detail || 'Invalid username or password')
        } finally { setLoading(false) }
    }

    return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-teal-500/20 rounded-2xl mb-4">
                        <span className="text-3xl">⚙️</span>
                    </div>
                    <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
                    <p className="text-gray-400 text-sm mt-1">AC & Refrigeration Management</p>
                </div>
                <form onSubmit={submit} className="bg-gray-900 rounded-2xl border border-gray-800 p-8 space-y-4">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm">{error}</div>
                    )}
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-2">Username</label>
                        <input
                            type="text" value={username} onChange={e => setUsername(e.target.value)} required
                            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-teal-500 outline-none"
                            placeholder="admin"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-2">Password</label>
                        <input
                            type="password" value={password} onChange={e => setPassword(e.target.value)} required
                            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-teal-500 outline-none"
                            placeholder="••••••••"
                        />
                    </div>
                    <button
                        type="submit" disabled={loading}
                        className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-teal-800 text-white font-medium py-3 rounded-xl text-sm transition-colors mt-2"
                    >
                        {loading ? 'Logging in…' : 'Login to Admin Panel'}
                    </button>
                </form>
                <p className="text-center text-gray-600 text-xs mt-4">
                    Default: admin / Admin@2026!
                </p>
            </div>
        </div>
    )
}

// ─── MAIN ADMIN PANEL ─────────────────────────────────────────────────────────
export default function AdminPanel() {
    const [token, setToken] = useState<string | null>(() => localStorage.getItem('admin_token'))
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

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3500) }

    if (!token) return <AdminLogin onLogin={t => setToken(t)} />

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const loadStats = useCallback(async () => {
        try { const r = await http.get('/api/admin/stats/'); setStats(r.data) }
        catch { /* ignore */ }
    }, [])

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const loadBookings = useCallback(async () => {
        setLoading(true)
        try {
            const r = await http.get('/api/admin/bookings/', { params: { page: bPage, per_page: 15, search: bSearch, status: bStatus } })
            setBookings(r.data.results || []); setBTotal(r.data.total || 0)
        } catch { setBookings([]) } finally { setLoading(false) }
    }, [bPage, bSearch, bStatus])

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const loadServices = useCallback(async () => {
        try { const r = await http.get('/api/admin/services/'); setServices(r.data || []) } catch { setServices([]) }
    }, [])

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const loadUsers = useCallback(async () => {
        setLoading(true)
        try {
            const r = await http.get('/api/admin/users/', { params: { page: uPage, per_page: 15, search: uSearch } })
            setUsers(r.data.results || []); setUTotal(r.data.total || 0)
        } catch { setUsers([]) } finally { setLoading(false) }
    }, [uPage, uSearch])

    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => { loadStats() }, [loadStats])
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => { if (tab === 'bookings') loadBookings() }, [tab, loadBookings])
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => { if (tab === 'services') loadServices() }, [tab, loadServices])
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => { if (tab === 'users') loadUsers() }, [tab, loadUsers])

    const saveBooking = async (data: Partial<Booking>) => {
        try { await http.put(`/api/admin/bookings/${editBooking!.id}/`, data); showToast('✅ Booking updated'); setEditBooking(null); loadBookings() }
        catch { showToast('❌ Failed to update booking') }
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
        } catch { showToast('❌ Failed to save') }
    }
    const deleteService = async (id: number) => {
        try { await http.delete(`/api/admin/services/${id}/`); showToast('🗑️ Service deleted'); setConfirmDel(null); loadServices() }
        catch { showToast('❌ Delete failed') }
    }
    const saveUser = async (data: Partial<User>) => {
        try { await http.put(`/api/admin/users/${editUser!.id}/`, data); showToast('✅ User updated'); setEditUser(null); loadUsers() }
        catch { showToast('❌ Failed to update') }
    }
    const deleteUser = async (id: number) => {
        try { await http.delete(`/api/admin/users/${id}/`); showToast('🗑️ User deleted'); setConfirmDel(null); loadUsers() }
        catch { showToast('❌ Delete failed') }
    }

    const logout = () => { localStorage.removeItem('admin_token'); setToken(null) }

    const TABS = [
        { id: 'dashboard', label: 'Dashboard', icon: '📊' },
        { id: 'bookings', label: 'Bookings', icon: '📋', badge: stats?.bookings.pending },
        { id: 'services', label: 'Services', icon: '🔧' },
        { id: 'users', label: 'Users', icon: '👥' },
    ]

    return (
        <div className="flex min-h-screen bg-gray-950 text-white font-sans">
            {/* Toast */}
            {toast && (
                <div className="fixed top-5 right-5 z-[100] bg-gray-800 border border-gray-700 text-white px-5 py-3 rounded-xl shadow-2xl text-sm font-medium">
                    {toast}
                </div>
            )}

            {/* ── Sidebar ── */}
            <aside className="w-64 shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col sticky top-0 h-screen">
                <div className="px-6 py-5 border-b border-gray-800">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">⚙️</span>
                        <div>
                            <p className="font-bold text-white text-sm">Admin Panel</p>
                            <p className="text-gray-500 text-xs">AC & Refrigeration</p>
                        </div>
                    </div>
                </div>
                <nav className="flex-1 p-4 space-y-1">
                    {TABS.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id as typeof tab)}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${tab === t.id
                                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            <span className="text-base">{t.icon}</span>
                            <span className="flex-1 text-left">{t.label}</span>
                            {t.badge !== undefined && t.badge > 0 && (
                                <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{t.badge}</span>
                            )}
                        </button>
                    ))}
                </nav>
                <div className="p-4 border-t border-gray-800">
                    <button onClick={logout} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors">
                        <span>🚪</span> Logout
                    </button>
                </div>
            </aside>

            {/* ── Main ── */}
            <main className="flex-1 overflow-auto p-8">

                {/* DASHBOARD */}
                {tab === 'dashboard' && (
                    <div>
                        <h2 className="text-2xl font-bold mb-7">Dashboard</h2>
                        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
                            {[
                                { label: 'Total Bookings', val: stats?.bookings.total, icon: '📋', from: 'from-blue-900/40', border: 'border-blue-700/40', text: 'text-blue-300' },
                                { label: 'Pending', val: stats?.bookings.pending, icon: '⏳', from: 'from-amber-900/40', border: 'border-amber-700/40', text: 'text-amber-300' },
                                { label: 'Completed', val: stats?.bookings.completed, icon: '✅', from: 'from-green-900/40', border: 'border-green-700/40', text: 'text-green-300' },
                                { label: 'Total Users', val: stats?.users.total, icon: '👥', from: 'from-purple-900/40', border: 'border-purple-700/40', text: 'text-purple-300' },
                            ].map(s => (
                                <div key={s.label} className={`bg-gradient-to-br ${s.from} border ${s.border} rounded-2xl p-5`}>
                                    <div className="text-2xl mb-3">{s.icon}</div>
                                    <div className={`text-3xl font-extrabold ${s.text}`}>{s.val ?? '–'}</div>
                                    <div className="text-gray-400 text-xs mt-1">{s.label}</div>
                                </div>
                            ))}
                        </div>

                        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
                                <h3 className="font-semibold text-gray-100">Recent Bookings</h3>
                                <button onClick={() => setTab('bookings')} className="text-teal-400 text-xs hover:underline">View all →</button>
                            </div>
                            <table className="w-full text-sm">
                                <thead><tr className="border-b border-gray-800">
                                    {['Invoice', 'Customer', 'Service', 'Date', 'Status'].map(h => (
                                        <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                                    ))}
                                </tr></thead>
                                <tbody>
                                    {!(stats?.recent_bookings?.length) && (
                                        <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-600 text-sm">No bookings yet</td></tr>
                                    )}
                                    {(stats?.recent_bookings || []).map(b => (
                                        <tr key={b.id} className="border-b border-gray-800/50 hover:bg-white/[0.02] transition-colors">
                                            <td className="px-4 py-3 font-mono text-teal-400 text-xs">{b.invoice_number || `#${b.id}`}</td>
                                            <td className="px-4 py-3 text-gray-200">{b.customer_name || '—'}</td>
                                            <td className="px-4 py-3 text-gray-400">{b.service_name || '—'}</td>
                                            <td className="px-4 py-3 text-gray-500 text-xs">{b.scheduled_date}</td>
                                            <td className="px-4 py-3"><Badge label={b.status} colorMap={STATUS_COLORS} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* BOOKINGS */}
                {tab === 'bookings' && (
                    <div>
                        <h2 className="text-2xl font-bold mb-6">Bookings <span className="text-gray-500 font-normal text-lg">({bTotal})</span></h2>
                        <div className="flex gap-3 mb-5 flex-wrap">
                            <input className={`${inp} flex-1 min-w-[200px]`} placeholder="Search invoice or address…"
                                value={bSearch} onChange={e => { setBSearch(e.target.value); setBPage(1) }} />
                            <select className={`${inp} w-44`} value={bStatus} onChange={e => { setBStatus(e.target.value); setBPage(1) }}>
                                <option value="">All Statuses</option>
                                {['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <button onClick={loadBookings} className="px-4 py-2 bg-teal-700 hover:bg-teal-600 rounded-xl text-sm font-medium transition-colors">🔄 Refresh</button>
                        </div>
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden mb-4">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm min-w-[800px]">
                                    <thead><tr className="border-b border-gray-800">
                                        {['Invoice', 'Customer', 'Service', 'Schedule', 'Status', 'Payment', 'Price SAR', 'Actions'].map(h => (
                                            <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                                        ))}
                                    </tr></thead>
                                    <tbody>
                                        {loading && <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-500">Loading…</td></tr>}
                                        {!loading && !bookings.length && <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-600">No bookings found</td></tr>}
                                        {bookings.map(b => (
                                            <tr key={b.id} className="border-b border-gray-800/60 hover:bg-white/[0.025] transition-colors">
                                                <td className="px-4 py-3 font-mono text-teal-400 text-xs">{b.invoice_number || `#${b.id}`}</td>
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-gray-100">{b.customer_name || '—'}</div>
                                                    <div className="text-gray-500 text-xs">{b.customer_phone}</div>
                                                </td>
                                                <td className="px-4 py-3 text-gray-300 max-w-[120px] truncate">{b.service_name || '—'}</td>
                                                <td className="px-4 py-3 text-gray-400 text-xs">{b.scheduled_date}<br />{b.scheduled_time}</td>
                                                <td className="px-4 py-3"><Badge label={b.status} colorMap={STATUS_COLORS} /></td>
                                                <td className="px-4 py-3"><Badge label={b.payment_status} colorMap={PAY_COLORS} /></td>
                                                <td className="px-4 py-3 text-gray-200 font-medium">{b.total_price}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex gap-1.5">
                                                        <button onClick={() => setEditBooking(b)} className="px-3 py-1.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg text-xs font-medium">✏️ Edit</button>
                                                        <button onClick={() => setConfirmDel({ type: 'booking', id: b.id, msg: `Delete booking ${b.invoice_number || b.id}?` })} className="px-2.5 py-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg text-xs">🗑️</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-500">{bookings.length} of {bTotal} bookings</p>
                            <div className="flex gap-2">
                                <button disabled={bPage === 1} onClick={() => setBPage(p => p - 1)} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-sm disabled:opacity-30 transition-colors">← Prev</button>
                                <span className="px-3 py-2 text-sm text-gray-400">Page {bPage}</span>
                                <button disabled={bPage * 15 >= bTotal} onClick={() => setBPage(p => p + 1)} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-sm disabled:opacity-30 transition-colors">Next →</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* SERVICES */}
                {tab === 'services' && (
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold">Services</h2>
                            <button onClick={() => setNewService(true)} className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 rounded-xl text-sm font-medium transition-colors">＋ Add Service</button>
                        </div>
                        <div className="space-y-3">
                            {!services.length && <p className="text-gray-500 py-12 text-center">No services found</p>}
                            {services.map(s => (
                                <div key={s.id} className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-2xl p-5 flex items-center gap-4 transition-colors">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                            <span className="font-semibold text-gray-100">{s.name_en}</span>
                                            {s.name_ar && <span className="text-gray-500 text-sm" dir="rtl">{s.name_ar}</span>}
                                            <Badge label={s.is_active ? 'Active' : 'Inactive'} colorMap={{ 'Active': 'bg-green-500/20 text-green-400', 'Inactive': 'bg-red-500/20 text-red-400' }} />
                                        </div>
                                        <div className="flex gap-4 text-xs text-gray-400 flex-wrap">
                                            <span>📂 {s.category}</span>
                                            <span>💰 {s.base_price} SAR</span>
                                            <span>⏱️ {s.duration_hours}h</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                        <button onClick={() => setEditService(s)} className="px-4 py-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-xl text-sm font-medium transition-colors">✏️ Edit</button>
                                        <button onClick={() => setConfirmDel({ type: 'service', id: s.id, msg: `Delete "${s.name_en}"?` })} className="px-4 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-xl text-sm transition-colors">🗑️ Delete</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* USERS */}
                {tab === 'users' && (
                    <div>
                        <h2 className="text-2xl font-bold mb-6">Users <span className="text-gray-500 font-normal text-lg">({uTotal})</span></h2>
                        <div className="flex gap-3 mb-5">
                            <input className={`${inp} flex-1`} placeholder="Search name, phone, email…"
                                value={uSearch} onChange={e => { setUSearch(e.target.value); setUPage(1) }} />
                            <button onClick={loadUsers} className="px-4 py-2 bg-teal-700 hover:bg-teal-600 rounded-xl text-sm transition-colors">🔄 Refresh</button>
                        </div>
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden mb-4">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm min-w-[750px]">
                                    <thead><tr className="border-b border-gray-800">
                                        {['Name', 'Username', 'Phone', 'Email', 'Role', 'Status', 'Joined', 'Actions'].map(h => (
                                            <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                                        ))}
                                    </tr></thead>
                                    <tbody>
                                        {loading && <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-500">Loading…</td></tr>}
                                        {!loading && !users.length && <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-600">No users found</td></tr>}
                                        {users.map(u => (
                                            <tr key={u.id} className="border-b border-gray-800/60 hover:bg-white/[0.025] transition-colors">
                                                <td className="px-4 py-3 font-medium text-gray-100">{u.first_name} {u.last_name}</td>
                                                <td className="px-4 py-3 text-gray-400 font-mono text-xs">{u.username}</td>
                                                <td className="px-4 py-3 text-gray-400">{u.phone || '—'}</td>
                                                <td className="px-4 py-3 text-gray-400 max-w-[140px] truncate">{u.email || '—'}</td>
                                                <td className="px-4 py-3">
                                                    <Badge label={u.role || 'customer'} colorMap={{ admin: 'bg-purple-500/20 text-purple-400', technician: 'bg-blue-500/20 text-blue-400', customer: 'bg-gray-700 text-gray-300' }} />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Badge label={u.is_active ? 'Active' : 'Inactive'} colorMap={{ Active: 'bg-green-500/20 text-green-400', Inactive: 'bg-red-500/20 text-red-400' }} />
                                                </td>
                                                <td className="px-4 py-3 text-gray-500 text-xs">{u.date_joined?.slice(0, 10) || '—'}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex gap-1.5">
                                                        <button onClick={() => setEditUser(u)} className="px-3 py-1.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg text-xs font-medium">✏️</button>
                                                        <button onClick={() => setConfirmDel({ type: 'user', id: u.id, msg: `Delete "${u.username}"?` })} className="px-2.5 py-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg text-xs">🗑️</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-500">{users.length} of {uTotal}</p>
                            <div className="flex gap-2">
                                <button disabled={uPage === 1} onClick={() => setUPage(p => p - 1)} className="px-4 py-2 bg-gray-800 rounded-xl text-sm disabled:opacity-30">← Prev</button>
                                <span className="px-3 py-2 text-sm text-gray-400">Page {uPage}</span>
                                <button disabled={uPage * 15 >= uTotal} onClick={() => setUPage(p => p + 1)} className="px-4 py-2 bg-gray-800 rounded-xl text-sm disabled:opacity-30">Next →</button>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* ── MODALS ── */}
            {editBooking && <BookingModal booking={editBooking} onClose={() => setEditBooking(null)} onSave={saveBooking} />}
            {(editService || newService) && <ServiceModal service={editService} onClose={() => { setEditService(null); setNewService(false) }} onSave={saveService} />}
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

// ─── BOOKING MODAL ────────────────────────────────────────────────────────────
function BookingModal({ booking, onClose, onSave }: { booking: Booking; onClose: () => void; onSave: (d: Partial<Booking>) => void }) {
    const [f, setF] = useState({ ...booking })
    const s = (k: keyof typeof f, v: string) => setF(p => ({ ...p, [k]: v }))
    return (
        <Modal title={`Edit Booking — ${booking.invoice_number || `#${booking.id}`}`} onClose={onClose}>
            <div className="grid grid-cols-2 gap-4">
                <Field label="Status">
                    <select className={inpLight} value={f.status} onChange={e => s('status', e.target.value)}>
                        {['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'].map(x => <option key={x} value={x}>{x}</option>)}
                    </select>
                </Field>
                <Field label="Payment Status">
                    <select className={inpLight} value={f.payment_status} onChange={e => s('payment_status', e.target.value)}>
                        {['pending', 'paid', 'failed', 'refunded'].map(x => <option key={x} value={x}>{x}</option>)}
                    </select>
                </Field>
                <Field label="Scheduled Date"><input type="date" className={inpLight} value={f.scheduled_date} onChange={e => s('scheduled_date', e.target.value)} /></Field>
                <Field label="Scheduled Time"><input type="text" className={inpLight} value={f.scheduled_time} onChange={e => s('scheduled_time', e.target.value)} /></Field>
                <div className="col-span-2"><Field label="Address"><input type="text" className={inpLight} value={f.address_street} onChange={e => s('address_street', e.target.value)} /></Field></div>
                <Field label="City"><input type="text" className={inpLight} value={f.address_city} onChange={e => s('address_city', e.target.value)} /></Field>
                <Field label="Total Price (SAR)"><input type="number" className={inpLight} value={f.total_price} onChange={e => s('total_price', e.target.value)} /></Field>
                <div className="col-span-2"><Field label="Notes"><textarea rows={3} className={inpLight} value={f.notes} onChange={e => s('notes', e.target.value)} /></Field></div>
            </div>
            <div className="flex gap-3 mt-6 justify-end">
                <button onClick={onClose} className="px-5 py-2 border rounded-xl text-sm text-gray-600">Cancel</button>
                <button onClick={() => onSave(f)} className="px-5 py-2 bg-teal-600 text-white rounded-xl text-sm hover:bg-teal-700">Save Changes</button>
            </div>
        </Modal>
    )
}

// ─── SERVICE MODAL ────────────────────────────────────────────────────────────
function ServiceModal({ service, onClose, onSave }: { service: Service | null; onClose: () => void; onSave: (d: Partial<Service>) => void }) {
    const [f, setF] = useState<Partial<Service>>(service ?? { is_active: true, category: 'ac', duration_hours: 1 })
    const s = (k: string, v: unknown) => setF(p => ({ ...p, [k]: v }))
    return (
        <Modal title={service ? `Edit — ${service.name_en}` : 'Add New Service'} onClose={onClose}>
            <div className="grid grid-cols-2 gap-4">
                <Field label="Name (English)"><input type="text" className={inpLight} value={f.name_en || ''} onChange={e => s('name_en', e.target.value)} /></Field>
                <Field label="Name (Arabic)"><input type="text" dir="rtl" className={inpLight} value={f.name_ar || ''} onChange={e => s('name_ar', e.target.value)} /></Field>
                <Field label="Category">
                    <select className={inpLight} value={f.category || 'ac'} onChange={e => s('category', e.target.value)}>
                        {['ac', 'refrigerator', 'washing_machine', 'oven', 'cold_storage'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </Field>
                <Field label="Base Price (SAR)"><input type="number" className={inpLight} value={f.base_price || ''} onChange={e => s('base_price', e.target.value)} /></Field>
                <Field label="Duration (hours)"><input type="number" step="0.5" className={inpLight} value={f.duration_hours || 1} onChange={e => s('duration_hours', parseFloat(e.target.value))} /></Field>
                <div className="flex items-center gap-2 pt-5">
                    <input type="checkbox" id="svc_active" checked={!!f.is_active} onChange={e => s('is_active', e.target.checked)} className="w-4 h-4 accent-teal-600" />
                    <label htmlFor="svc_active" className="text-sm text-gray-600">Active (visible to customers)</label>
                </div>
                <div className="col-span-2"><Field label="Description (English)"><textarea rows={2} className={inpLight} value={f.description_en || ''} onChange={e => s('description_en', e.target.value)} /></Field></div>
                <div className="col-span-2"><Field label="Description (Arabic)"><textarea rows={2} dir="rtl" className={inpLight} value={f.description_ar || ''} onChange={e => s('description_ar', e.target.value)} /></Field></div>
            </div>
            <div className="flex gap-3 mt-6 justify-end">
                <button onClick={onClose} className="px-5 py-2 border rounded-xl text-sm text-gray-600">Cancel</button>
                <button onClick={() => onSave(f)} className="px-5 py-2 bg-teal-600 text-white rounded-xl text-sm hover:bg-teal-700">{service ? 'Save Changes' : 'Create Service'}</button>
            </div>
        </Modal>
    )
}

// ─── USER MODAL ───────────────────────────────────────────────────────────────
function UserModal({ user, onClose, onSave }: { user: User; onClose: () => void; onSave: (d: Partial<User>) => void }) {
    const [f, setF] = useState({ ...user })
    const s = (k: keyof typeof f, v: unknown) => setF(p => ({ ...p, [k]: v }))
    return (
        <Modal title={`Edit User — ${user.username}`} onClose={onClose}>
            <div className="grid grid-cols-2 gap-4">
                <Field label="First Name"><input type="text" className={inpLight} value={f.first_name} onChange={e => s('first_name', e.target.value)} /></Field>
                <Field label="Last Name"><input type="text" className={inpLight} value={f.last_name} onChange={e => s('last_name', e.target.value)} /></Field>
                <Field label="Email"><input type="email" className={inpLight} value={f.email} onChange={e => s('email', e.target.value)} /></Field>
                <Field label="Phone"><input type="text" className={inpLight} value={f.phone} onChange={e => s('phone', e.target.value)} /></Field>
                <Field label="Role">
                    <select className={inpLight} value={f.role || 'customer'} onChange={e => s('role', e.target.value)}>
                        <option value="customer">Customer</option>
                        <option value="technician">Technician</option>
                        <option value="admin">Admin</option>
                    </select>
                </Field>
                <div className="flex items-center gap-2 pt-5">
                    <input type="checkbox" id="usr_active" checked={!!f.is_active} onChange={e => s('is_active', e.target.checked)} className="w-4 h-4 accent-teal-600" />
                    <label htmlFor="usr_active" className="text-sm text-gray-600">Active Account</label>
                </div>
            </div>
            <div className="flex gap-3 mt-6 justify-end">
                <button onClick={onClose} className="px-5 py-2 border rounded-xl text-sm text-gray-600">Cancel</button>
                <button onClick={() => onSave(f)} className="px-5 py-2 bg-teal-600 text-white rounded-xl text-sm hover:bg-teal-700">Save Changes</button>
            </div>
        </Modal>
    )
}
