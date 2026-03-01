import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'

const BACKEND = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL || '')
const http = axios.create({ baseURL: BACKEND })
http.interceptors.request.use(cfg => {
    const t = localStorage.getItem('admin_token')
    if (t) cfg.headers.Authorization = `Bearer ${t}`
    return cfg
})

// ── Types ─────────────────────────────────────────────────────────────────────
type Booking = { id: number; invoice_number: string; customer_name: string; customer_phone: string; service_name: string; scheduled_date: string; scheduled_time: string; status: string; payment_status: string; total_price: string; address_street: string; address_city: string; notes: string }
type Service = { id: number; name_en: string; name_ar: string; description_en?: string; description_ar?: string; category: string; base_price: string; duration_hours: number; is_active: boolean }
type User = { id: number; username: string; first_name: string; last_name: string; email: string; phone: string; role: string; is_active: boolean; date_joined: string }
type Payment = { id: number; booking_id: number; amount: string; status: string; method: string; transaction_id: string; created_at: string }
type Notif = { id: number; channel: string; recipient: string; message: string; status: string; created_at: string }
type Stats = { bookings: { total: number; pending: number; confirmed: number; completed: number; cancelled: number; in_progress: number }; users: { total: number }; services: { total: number; active: number }; payments: { total: number; paid: number; pending: number; revenue: number }; notifications: { total: number; sent: number }; recent_bookings: Booking[] }
type SiteSettings = { company_name_ar?: string; company_name_en?: string; phone?: string; whatsapp?: string; email?: string; address_ar?: string; address_en?: string; footer_text_ar?: string; footer_text_en?: string; facebook_url?: string; instagram_url?: string; about_ar?: string; about_en?: string }

// ── Constants ─────────────────────────────────────────────────────────────────
const S_MAP: Record<string, string> = { pending: 'bg-amber-100 text-amber-700', confirmed: 'bg-blue-100 text-blue-700', in_progress: 'bg-purple-100 text-purple-700', completed: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-700' }
const P_MAP: Record<string, string> = { pending: 'bg-orange-100 text-orange-700', paid: 'bg-emerald-100 text-emerald-700', failed: 'bg-red-100 text-red-700', refunded: 'bg-gray-200 text-gray-700' }
const inp = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:border-teal-500 outline-none'
const inpW = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:border-teal-500 outline-none'
const TABS = [{ id: 'dashboard', icon: '📊', label: 'Dashboard' }, { id: 'bookings', icon: '📋', label: 'Bookings' }, { id: 'services', icon: '🔧', label: 'Services' }, { id: 'users', icon: '👥', label: 'Users' }, { id: 'payments', icon: '💳', label: 'Payments' }, { id: 'notifications', icon: '🔔', label: 'Notifications' }, { id: 'settings', icon: '⚙️', label: 'Settings' }]

// ── Small components ──────────────────────────────────────────────────────────
function Badge({ t, m }: { t: string; m: Record<string, string> }) { return <span className={`px-2 py-0.5 rounded text-xs font-semibold ${m[t] || 'bg-gray-200 text-gray-600'}`}>{t}</span> }
function FL({ label, children }: { label: string; children: React.ReactNode }) { return <div><p className="text-xs font-semibold text-gray-700 mb-1">{label}</p>{children}</div> }
function Th({ cols }: { cols: string[] }) { return <thead><tr className="border-b border-gray-800 text-gray-500">{cols.map(h => <th key={h} className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr></thead> }
function Empty({ cols, msg }: { cols: number; msg: string }) { return <tr><td colSpan={cols} className="px-4 py-10 text-center text-gray-600 text-xs">{msg}</td></tr> }

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
    return (
        <div dir="ltr" className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto text-gray-900">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <h3 className="font-bold text-gray-800 text-sm">{title}</h3>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg">×</button>
                </div>
                <div className="p-6 text-gray-900">{children}</div>
            </div>
        </div>
    )
}
function Confirm({ msg, onOk, onNo }: { msg: string; onOk: () => void; onNo: () => void }) {
    return (
        <div dir="ltr" className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center text-gray-900">
                <div className="text-5xl mb-3">🗑️</div>
                <h3 className="font-bold text-gray-800 mb-2">Confirm Delete</h3>
                <p className="text-gray-500 text-sm mb-6">{msg}</p>
                <div className="flex gap-3 justify-center">
                    <button onClick={onNo} className="px-5 py-2 rounded-xl border border-gray-300 text-gray-700 text-sm">Cancel</button>
                    <button onClick={onOk} className="px-5 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold">Delete</button>
                </div>
            </div>
        </div>
    )
}

// ── Login ─────────────────────────────────────────────────────────────────────
function Login({ onLogin }: { onLogin: (tk: string, u: Record<string, unknown>) => void }) {
    const [user, setUser] = useState(''); const [pass, setPass] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
    const go = async (e: React.FormEvent) => {
        e.preventDefault(); setErr(''); setBusy(true)
        try {
            const r = await axios.post(`${BACKEND}/api/auth/login/`, { username: user, password: pass }); const d = r.data; const tk = d.access || d.token || ''; const u = d.user || {}
            if (!(u.is_staff || u.role === 'admin')) { setErr('Access denied. Admin accounts only.'); return }
            localStorage.setItem('admin_token', tk); onLogin(tk, u)
        } catch (ex: unknown) { const a = ex as { response?: { data?: { detail?: string } } }; setErr(a?.response?.data?.detail || 'Invalid credentials') } finally { setBusy(false) }
    }
    return (
        <div dir="ltr" className="min-h-screen bg-gradient-to-br from-gray-950 to-gray-900 flex items-center justify-center p-4">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-teal-500/10 border border-teal-500/20 mb-4 text-3xl">⚙️</div>
                    <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
                    <p className="text-gray-500 text-sm mt-1">AC & Refrigeration Management</p>
                </div>
                <form onSubmit={go} className="bg-gray-900 border border-gray-800 rounded-2xl p-8 space-y-4 shadow-2xl">
                    {err && <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-xs">{err}</div>}
                    <div><p className="text-xs text-gray-400 mb-1 font-medium">Username</p>
                        <input type="text" value={user} onChange={e => setUser(e.target.value)} required placeholder="admin"
                            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-teal-500 outline-none" /></div>
                    <div><p className="text-xs text-gray-400 mb-1 font-medium">Password</p>
                        <input type="password" value={pass} onChange={e => setPass(e.target.value)} required placeholder="••••••••"
                            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-teal-500 outline-none" /></div>
                    <button type="submit" disabled={busy} className="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl text-sm transition-colors">
                        {busy ? 'Signing in…' : '🔐 Login'}
                    </button>
                </form>
            </div>
        </div>
    )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AdminPanel() {
    const [token, setToken] = useState<string | null>(() => localStorage.getItem('admin_token'))
    const [name, setName] = useState('Admin')
    const [tab, setTab] = useState<string>('dashboard')
    const [stats, setStats] = useState<Stats | null>(null)
    const [bookings, setBookings] = useState<Booking[]>([]); const [bTotal, setBTotal] = useState(0); const [bPage, setBPage] = useState(1); const [bSearch, setBSearch] = useState(''); const [bStatus, setBStatus] = useState('')
    const [services, setServices] = useState<Service[]>([])
    const [users, setUsers] = useState<User[]>([]); const [uTotal, setUTotal] = useState(0); const [uPage, setUPage] = useState(1); const [uSearch, setUSearch] = useState('')
    const [payments, setPayments] = useState<Payment[]>([]); const [pyTotal, setPyTotal] = useState(0); const [pyPage, setPyPage] = useState(1); const [pyStatus, setPyStatus] = useState('')
    const [notifs, setNotifs] = useState<Notif[]>([]); const [nTotal, setNTotal] = useState(0); const [nPage, setNPage] = useState(1)
    const [siteSettings, setSiteSettings] = useState<SiteSettings>({})
    const [settingsBusy, setSettingsBusy] = useState(false)
    const [loading, setLoading] = useState(false)
    const [editB, setEditB] = useState<Booking | null>(null); const [editS, setEditS] = useState<Service | null>(null); const [editU, setEditU] = useState<User | null>(null); const [newSvc, setNewSvc] = useState(false)
    const [del, setDel] = useState<{ type: string; id: number; msg: string } | null>(null)
    const [toast, setToast] = useState('')
    const ok = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3200) }

    const loadStats = useCallback(async () => { try { const r = await http.get('/api/admin/stats/'); setStats(r.data) } catch { } }, [])
    const loadBookings = useCallback(async () => { setLoading(true); try { const r = await http.get('/api/admin/bookings/', { params: { page: bPage, per_page: 15, search: bSearch, status: bStatus } }); setBookings(r.data.results || []); setBTotal(r.data.total || 0) } catch { setBookings([]) } finally { setLoading(false) } }, [bPage, bSearch, bStatus])
    const loadServices = useCallback(async () => { try { const r = await http.get('/api/admin/services/'); setServices(r.data || []) } catch { setServices([]) } }, [])
    const loadUsers = useCallback(async () => { setLoading(true); try { const r = await http.get('/api/admin/users/', { params: { page: uPage, per_page: 15, search: uSearch } }); setUsers(r.data.results || []); setUTotal(r.data.total || 0) } catch { setUsers([]) } finally { setLoading(false) } }, [uPage, uSearch])
    const loadPayments = useCallback(async () => { setLoading(true); try { const r = await http.get('/api/admin/payments/', { params: { page: pyPage, per_page: 15, status: pyStatus } }); setPayments(r.data.results || []); setPyTotal(r.data.total || 0) } catch { setPayments([]) } finally { setLoading(false) } }, [pyPage, pyStatus])
    const loadNotifs = useCallback(async () => { setLoading(true); try { const r = await http.get('/api/admin/notifications/', { params: { page: nPage, per_page: 20 } }); setNotifs(r.data.results || []); setNTotal(r.data.total || 0) } catch { setNotifs([]) } finally { setLoading(false) } }, [nPage])
    const loadSettings = useCallback(async () => { try { const r = await http.get('/api/admin/settings/'); setSiteSettings(r.data || {}) } catch { } }, [])

    useEffect(() => { if (token) loadStats() }, [token, loadStats])
    useEffect(() => { if (token && tab === 'bookings') loadBookings() }, [token, tab, loadBookings])
    useEffect(() => { if (token && tab === 'services') loadServices() }, [token, tab, loadServices])
    useEffect(() => { if (token && tab === 'users') loadUsers() }, [token, tab, loadUsers])
    useEffect(() => { if (token && tab === 'payments') loadPayments() }, [token, tab, loadPayments])
    useEffect(() => { if (token && tab === 'notifications') loadNotifs() }, [token, tab, loadNotifs])
    useEffect(() => { if (token && tab === 'settings') loadSettings() }, [token, tab, loadSettings])

    const saveBooking = async (d: Partial<Booking>) => { try { await http.put(`/api/admin/bookings/${editB!.id}/`, d); ok('✅ Booking updated'); setEditB(null); loadBookings() } catch { ok('❌ Update failed') } }
    const delBooking = async (id: number) => { try { await http.delete(`/api/admin/bookings/${id}/`); ok('🗑️ Deleted'); setDel(null); loadBookings() } catch { ok('❌ Failed') } }
    const saveService = async (d: Partial<Service>) => { try { if (newSvc) { await http.post('/api/admin/services/', d); ok('✅ Created'); setNewSvc(false) } else { await http.put(`/api/admin/services/${editS!.id}/`, d); ok('✅ Updated'); setEditS(null) }; loadServices() } catch { ok('❌ Failed') } }
    const delService = async (id: number) => { try { await http.delete(`/api/admin/services/${id}/`); ok('🗑️ Deleted'); setDel(null); loadServices() } catch { ok('❌ Failed') } }
    const saveUser = async (d: Partial<User>) => { try { await http.put(`/api/admin/users/${editU!.id}/`, d); ok('✅ Updated'); setEditU(null); loadUsers() } catch { ok('❌ Failed') } }
    const delUser = async (id: number) => { try { await http.delete(`/api/admin/users/${id}/`); ok('🗑️ Deleted'); setDel(null); loadUsers() } catch { ok('❌ Failed') } }
    const saveSettings = async () => { setSettingsBusy(true); try { await http.put('/api/admin/settings/', siteSettings); ok('✅ Settings saved') } catch { ok('❌ Save failed') } finally { setSettingsBusy(false) } }

    if (!token) return <Login onLogin={(tk, u) => { setToken(tk); const n = ((u.first_name as string) || '') + ' ' + ((u.last_name as string) || ''); setName(n.trim() || (u.username as string) || 'Admin') }} />

    const Pg = ({ page, total, pp, set }: { page: number; total: number; pp: number; set: (n: number) => void }) => (
        <div className="flex items-center justify-between mt-4">
            <p className="text-gray-500 text-xs">{Math.min((page - 1) * pp + 1, total)}–{Math.min(page * pp, total)} of {total}</p>
            <div className="flex gap-2">
                <button disabled={page === 1} onClick={() => set(page - 1)} className="px-4 py-2 bg-gray-800 rounded-xl text-xs disabled:opacity-30">← Prev</button>
                <span className="px-3 py-2 text-xs text-gray-500">Page {page}</span>
                <button disabled={page * pp >= total} onClick={() => set(page + 1)} className="px-4 py-2 bg-gray-800 rounded-xl text-xs disabled:opacity-30">Next →</button>
            </div>
        </div>
    )

    return (
        <div dir="ltr" className="flex min-h-screen bg-gray-950 text-white text-sm" style={{ fontFamily: 'Inter,system-ui,sans-serif' }}>
            {toast && <div className="fixed top-5 right-5 z-[300] bg-gray-900 border border-gray-700 text-white px-5 py-3 rounded-xl shadow-2xl text-xs font-medium">{toast}</div>}

            {/* Sidebar */}
            <aside className="w-60 shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col h-screen sticky top-0">
                <div className="px-5 py-5 border-b border-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-lg">⚙️</div>
                        <div><p className="font-bold text-white text-xs">Admin Panel</p><p className="text-gray-600 text-xs">AC & Refrigeration</p></div>
                    </div>
                </div>
                <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
                    {TABS.map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left ${tab === t.id ? 'bg-teal-500/15 text-teal-300 border border-teal-500/25' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}>
                            <span className="text-base w-5 text-center">{t.icon}</span>
                            <span className="flex-1">{t.label}</span>
                            {t.id === 'bookings' && stats?.bookings.pending > 0 && <span className="bg-amber-500 text-white text-[9px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1">{stats.bookings.pending}</span>}
                        </button>
                    ))}
                </nav>
                <div className="p-3 border-t border-gray-800 space-y-1">
                    <div className="px-3 py-2 text-xs text-gray-500 truncate">👤 {name}</div>
                    <button onClick={() => { localStorage.removeItem('admin_token'); setToken(null) }} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors text-left">🚪 Logout</button>
                    <a href="/" className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-gray-500 hover:text-gray-200 hover:bg-white/5 transition-colors">🌐 Back to Site</a>
                </div>
            </aside>

            {/* Main */}
            <main className="flex-1 overflow-auto">
                <div className="sticky top-0 z-30 bg-gray-950/80 backdrop-blur border-b border-gray-800 px-8 py-3 flex items-center justify-between">
                    <h1 className="font-semibold text-gray-200 capitalize">{tab}</h1>
                    <div className="text-xs text-gray-600">{new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</div>
                </div>
                <div className="p-8 space-y-6">

                    {/* ── DASHBOARD ─────────────────────────────────────────────────── */}
                    {tab === 'dashboard' && <>
                        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                            {[{ l: 'Total Bookings', v: stats?.bookings.total, i: '📋', bg: 'from-blue-900/30', b: 'border-blue-700/30', c: 'text-blue-300' },
                            { l: 'Pending', v: stats?.bookings.pending, i: '⏳', bg: 'from-amber-900/30', b: 'border-amber-700/30', c: 'text-amber-300' },
                            { l: 'Completed', v: stats?.bookings.completed, i: '✅', bg: 'from-green-900/30', b: 'border-green-700/30', c: 'text-green-300' },
                            { l: 'Revenue (SAR)', v: stats?.payments.revenue?.toLocaleString(), i: '💰', bg: 'from-teal-900/30', b: 'border-teal-700/30', c: 'text-teal-300' },
                            ].map(s => (
                                <div key={s.l} className={`bg-gradient-to-br ${s.bg} to-transparent border ${s.b} rounded-2xl p-5`}>
                                    <div className="text-2xl mb-2">{s.i}</div>
                                    <div className={`text-3xl font-extrabold ${s.c}`}>{s.v ?? '—'}</div>
                                    <div className="text-gray-500 text-xs mt-1">{s.l}</div>
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            {[{ l: 'Users', v: stats?.users.total, i: '👥' }, { l: 'Active Services', v: stats?.services.active, i: '🔧' }, { l: 'Notifications Sent', v: stats?.notifications.sent, i: '🔔' }].map(s => (
                                <div key={s.l} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-4">
                                    <span className="text-2xl">{s.i}</span><div><p className="text-gray-500 text-xs">{s.l}</p><p className="text-xl font-bold">{s.v ?? '—'}</p></div>
                                </div>
                            ))}
                        </div>
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
                                <h3 className="font-semibold text-xs uppercase tracking-wider text-gray-400">Recent Bookings</h3>
                                <button onClick={() => setTab('bookings')} className="text-teal-400 text-xs hover:underline">View all →</button>
                            </div>
                            <div className="overflow-x-auto"><table className="w-full text-xs">
                                <Th cols={['Invoice', 'Customer', 'Service', 'Date', 'Status', 'Payment']} />
                                <tbody>{!(stats?.recent_bookings?.length) && <Empty cols={6} msg="No bookings yet" />}
                                    {(stats?.recent_bookings || []).map(b => (
                                        <tr key={b.id} className="border-b border-gray-800/50 hover:bg-white/[0.02]">
                                            <td className="px-4 py-3 font-mono text-teal-400">{b.invoice_number || `#${b.id}`}</td>
                                            <td className="px-4 py-3 text-gray-200">{b.customer_name || '—'}</td>
                                            <td className="px-4 py-3 text-gray-400">{b.service_name || '—'}</td>
                                            <td className="px-4 py-3 text-gray-500">{b.scheduled_date}</td>
                                            <td className="px-4 py-3"><Badge t={b.status} m={S_MAP} /></td>
                                            <td className="px-4 py-3"><Badge t={b.payment_status} m={P_MAP} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table></div>
                        </div>
                    </>}

                    {/* ── BOOKINGS ──────────────────────────────────────────────────── */}
                    {tab === 'bookings' && <>
                        <div className="flex items-center justify-between"><h2 className="text-lg font-bold">Bookings <span className="text-gray-500 font-normal">({bTotal})</span></h2><button onClick={loadBookings} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-xs">🔄 Refresh</button></div>
                        <div className="flex gap-3 flex-wrap">
                            <input className={`${inp} flex-1 min-w-[180px]`} placeholder="Search invoice, name, address…" value={bSearch} onChange={e => { setBSearch(e.target.value); setBPage(1) }} />
                            <select className={`${inp} w-40`} value={bStatus} onChange={e => { setBStatus(e.target.value); setBPage(1) }}>
                                <option value="">All Statuses</option>
                                {['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'].map(s => <option key={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-xs min-w-[900px]">
                            <Th cols={['Invoice', 'Customer', 'Service', 'Date/Time', 'Status', 'Payment', 'SAR', 'Actions']} />
                            <tbody>
                                {loading && <Empty cols={8} msg="Loading…" />}
                                {!loading && !bookings.length && <Empty cols={8} msg="No bookings found" />}
                                {bookings.map(b => (
                                    <tr key={b.id} className="border-b border-gray-800/50 hover:bg-white/[0.02]">
                                        <td className="px-4 py-3 font-mono text-teal-400">{b.invoice_number || `#${b.id}`}</td>
                                        <td className="px-4 py-3"><div className="text-gray-100 font-medium">{b.customer_name || '—'}</div><div className="text-gray-500">{b.customer_phone}</div></td>
                                        <td className="px-4 py-3 text-gray-300 max-w-[110px] truncate">{b.service_name || '—'}</td>
                                        <td className="px-4 py-3 text-gray-400">{b.scheduled_date}<br />{b.scheduled_time}</td>
                                        <td className="px-4 py-3"><Badge t={b.status} m={S_MAP} /></td>
                                        <td className="px-4 py-3"><Badge t={b.payment_status} m={P_MAP} /></td>
                                        <td className="px-4 py-3 font-semibold text-gray-200">{b.total_price}</td>
                                        <td className="px-4 py-3"><div className="flex gap-1.5">
                                            <button onClick={() => setEditB(b)} className="px-3 py-1.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg font-medium">✏️ Edit</button>
                                            <button onClick={() => setDel({ type: 'booking', id: b.id, msg: `Delete booking ${b.invoice_number || b.id}?` })} className="px-2.5 py-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg">🗑️</button>
                                        </div></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table></div></div>
                        <Pg page={bPage} total={bTotal} pp={15} set={setBPage} />
                    </>}

                    {/* ── SERVICES ──────────────────────────────────────────────────── */}
                    {tab === 'services' && <>
                        <div className="flex items-center justify-between"><h2 className="text-lg font-bold">Services <span className="text-gray-500 font-normal">({services.length})</span></h2>
                            <div className="flex gap-2">
                                <button onClick={loadServices} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-xs">🔄 Refresh</button>
                                <button onClick={() => setNewSvc(true)} className="px-5 py-2 bg-teal-600 hover:bg-teal-700 rounded-xl text-xs font-semibold">＋ Add Service</button>
                            </div>
                        </div>
                        {!services.length && <p className="text-gray-600 text-center py-16">No services found</p>}
                        <div className="space-y-3">{services.map(s => (
                            <div key={s.id} className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-2xl p-5 flex items-center gap-4 transition-colors">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                                        <span className="font-semibold text-gray-100">{s.name_en}</span>
                                        {s.name_ar && <span className="text-gray-500 text-xs" dir="rtl">{s.name_ar}</span>}
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{s.is_active ? 'Active' : 'Inactive'}</span>
                                    </div>
                                    <div className="flex gap-4 text-xs text-gray-500 flex-wrap"><span>📂 {s.category}</span><span>💰 {s.base_price} SAR</span><span>⏱️ {s.duration_hours}h</span></div>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                    <button onClick={() => setEditS(s)} className="px-4 py-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-xl text-xs font-medium">✏️ Edit</button>
                                    <button onClick={() => setDel({ type: 'service', id: s.id, msg: `Delete "${s.name_en}"?` })} className="px-3 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-xl text-xs">🗑️</button>
                                </div>
                            </div>
                        ))}</div>
                    </>}

                    {/* ── USERS ────────────────────────────────────────────────────── */}
                    {tab === 'users' && <>
                        <div className="flex items-center justify-between"><h2 className="text-lg font-bold">Users <span className="text-gray-500 font-normal">({uTotal})</span></h2><button onClick={loadUsers} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-xs">🔄 Refresh</button></div>
                        <input className={`${inp} max-w-sm`} placeholder="Search name, phone, email…" value={uSearch} onChange={e => { setUSearch(e.target.value); setUPage(1) }} />
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-xs min-w-[720px]">
                            <Th cols={['Name', 'Username', 'Phone', 'Email', 'Role', 'Status', 'Joined', 'Actions']} />
                            <tbody>
                                {loading && <Empty cols={8} msg="Loading…" />}
                                {!loading && !users.length && <Empty cols={8} msg="No users found" />}
                                {users.map(u => (
                                    <tr key={u.id} className="border-b border-gray-800/50 hover:bg-white/[0.02]">
                                        <td className="px-4 py-3 font-medium text-gray-100">{u.first_name} {u.last_name}</td>
                                        <td className="px-4 py-3 font-mono text-gray-400">{u.username}</td>
                                        <td className="px-4 py-3 text-gray-400">{u.phone || '—'}</td>
                                        <td className="px-4 py-3 text-gray-400 max-w-[140px] truncate">{u.email || '—'}</td>
                                        <td className="px-4 py-3"><Badge t={u.role || 'customer'} m={{ admin: 'bg-purple-500/20 text-purple-400', technician: 'bg-blue-500/20 text-blue-400', customer: 'bg-gray-700 text-gray-300' }} /></td>
                                        <td className="px-4 py-3"><Badge t={u.is_active ? 'Active' : 'Inactive'} m={{ Active: 'bg-green-500/20 text-green-400', Inactive: 'bg-red-500/20 text-red-400' }} /></td>
                                        <td className="px-4 py-3 text-gray-600">{u.date_joined?.slice(0, 10) || '—'}</td>
                                        <td className="px-4 py-3"><div className="flex gap-1.5">
                                            <button onClick={() => setEditU(u)} className="px-3 py-1.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg font-medium">✏️</button>
                                            <button onClick={() => setDel({ type: 'user', id: u.id, msg: `Delete "${u.username}"?` })} className="px-2.5 py-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg">🗑️</button>
                                        </div></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table></div></div>
                        <Pg page={uPage} total={uTotal} pp={15} set={setUPage} />
                    </>}

                    {/* ── PAYMENTS ─────────────────────────────────────────────────── */}
                    {tab === 'payments' && <>
                        <div className="flex items-center justify-between"><h2 className="text-lg font-bold">Payments <span className="text-gray-500 font-normal">({pyTotal})</span></h2>
                            <div className="flex gap-2">
                                <select className={`${inp} w-40`} value={pyStatus} onChange={e => { setPyStatus(e.target.value); setPyPage(1) }}>
                                    <option value="">All Statuses</option>{['pending', 'paid', 'failed', 'refunded'].map(s => <option key={s}>{s}</option>)}
                                </select>
                                <button onClick={loadPayments} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-xs">🔄 Refresh</button>
                            </div>
                        </div>
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-xs min-w-[700px]">
                            <Th cols={['ID', 'Booking', 'Amount SAR', 'Method', 'Transaction ID', 'Status', 'Date']} />
                            <tbody>
                                {loading && <Empty cols={7} msg="Loading…" />}
                                {!loading && !payments.length && <Empty cols={7} msg="No payments found" />}
                                {payments.map(p => (
                                    <tr key={p.id} className="border-b border-gray-800/50 hover:bg-white/[0.02]">
                                        <td className="px-4 py-3 font-mono text-gray-500">#{p.id}</td>
                                        <td className="px-4 py-3 font-mono text-teal-400">#{p.booking_id}</td>
                                        <td className="px-4 py-3 font-semibold text-gray-200">{p.amount}</td>
                                        <td className="px-4 py-3 text-gray-400">{p.method || '—'}</td>
                                        <td className="px-4 py-3 text-gray-500 font-mono text-[10px] max-w-[140px] truncate">{p.transaction_id || '—'}</td>
                                        <td className="px-4 py-3"><Badge t={p.status} m={P_MAP} /></td>
                                        <td className="px-4 py-3 text-gray-500">{p.created_at?.slice(0, 10) || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table></div></div>
                        <Pg page={pyPage} total={pyTotal} pp={15} set={setPyPage} />
                    </>}

                    {/* ── NOTIFICATIONS ────────────────────────────────────────────── */}
                    {tab === 'notifications' && <>
                        <div className="flex items-center justify-between"><h2 className="text-lg font-bold">Notification Log <span className="text-gray-500 font-normal">({nTotal})</span></h2><button onClick={loadNotifs} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-xs">🔄 Refresh</button></div>
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-xs min-w-[700px]">
                            <Th cols={['Channel', 'Recipient', 'Message', 'Status', 'Date']} />
                            <tbody>
                                {loading && <Empty cols={5} msg="Loading…" />}
                                {!loading && !notifs.length && <Empty cols={5} msg="No notifications logged" />}
                                {notifs.map((n, i) => (
                                    <tr key={n.id || i} className="border-b border-gray-800/50 hover:bg-white/[0.02]">
                                        <td className="px-4 py-3"><span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded text-xs">{n.channel}</span></td>
                                        <td className="px-4 py-3 text-gray-300">{n.recipient}</td>
                                        <td className="px-4 py-3 text-gray-400 max-w-[280px] truncate">{n.message}</td>
                                        <td className="px-4 py-3"><Badge t={n.status} m={{ sent: 'bg-green-500/20 text-green-400', failed: 'bg-red-500/20 text-red-400', pending: 'bg-amber-500/20 text-amber-400' }} /></td>
                                        <td className="px-4 py-3 text-gray-500">{n.created_at?.slice(0, 16) || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table></div></div>
                        <Pg page={nPage} total={nTotal} pp={20} set={setNPage} />
                    </>}

                    {/* ── SETTINGS ─────────────────────────────────────────────────── */}
                    {tab === 'settings' && <>
                        <div className="flex items-center justify-between"><h2 className="text-lg font-bold">Site Settings</h2>
                            <button onClick={saveSettings} disabled={settingsBusy} className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 rounded-xl text-xs font-semibold">
                                {settingsBusy ? 'Saving…' : '💾 Save Settings'}
                            </button>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                            {([
                                { k: 'company_name_en', l: 'Company Name (English)' }, { k: 'company_name_ar', l: 'Company Name (Arabic)', rtl: true },
                                { k: 'phone', l: 'Phone Number' }, { k: 'whatsapp', l: 'WhatsApp Number' },
                                { k: 'email', l: 'Email Address' }, { k: 'address_en', l: 'Address (English)' },
                                { k: 'address_ar', l: 'Address (Arabic)', rtl: true }, { k: 'footer_text_ar', l: 'Footer Text (Arabic)', rtl: true },
                                { k: 'footer_text_en', l: 'Footer Text (English)' }, { k: 'facebook_url', l: 'Facebook URL' },
                                { k: 'instagram_url', l: 'Instagram URL' }, { k: 'twitter_url', l: 'Twitter / X URL' },
                            ] as { k: keyof SiteSettings; l: string; rtl?: boolean }[]).map(({ k, l, rtl }) => (
                                <div key={k} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                                    <p className="text-xs font-semibold text-gray-400 mb-2">{l}</p>
                                    <input type="text" dir={rtl ? 'rtl' : 'ltr'} value={(siteSettings[k] as string) || ''} onChange={e => setSiteSettings(p => ({ ...p, [k]: e.target.value }))}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:border-teal-500 outline-none" />
                                </div>
                            ))}
                            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                                <p className="text-xs font-semibold text-gray-400 mb-2">About (English)</p>
                                <textarea rows={4} value={siteSettings.about_en || ''} onChange={e => setSiteSettings(p => ({ ...p, about_en: e.target.value }))}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:border-teal-500 outline-none resize-none" />
                            </div>
                            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                                <p className="text-xs font-semibold text-gray-400 mb-2">About (Arabic)</p>
                                <textarea dir="rtl" rows={4} value={siteSettings.about_ar || ''} onChange={e => setSiteSettings(p => ({ ...p, about_ar: e.target.value }))}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:border-teal-500 outline-none resize-none" />
                            </div>
                        </div>
                    </>}

                </div>
            </main>

            {/* ── Modals ── */}
            {editB && <BModal b={editB} onClose={() => setEditB(null)} onSave={saveBooking} />}
            {(editS || newSvc) && <SModal s={editS} onClose={() => { setEditS(null); setNewSvc(false) }} onSave={saveService} />}
            {editU && <UModal u={editU} onClose={() => setEditU(null)} onSave={saveUser} />}
            {del && <Confirm msg={del.msg} onNo={() => setDel(null)} onOk={() => { if (del.type === 'booking') delBooking(del.id); if (del.type === 'service') delService(del.id); if (del.type === 'user') delUser(del.id) }} />}
        </div>
    )
}

// ── Booking modal ─────────────────────────────────────────────────────────────
function BModal({ b, onClose, onSave }: { b: Booking; onClose: () => void; onSave: (d: Partial<Booking>) => void }) {
    const [f, setF] = useState({ ...b }); const s = (k: keyof typeof f, v: string) => setF(p => ({ ...p, [k]: v }))
    return <Modal title={`Edit Booking — ${b.invoice_number || `#${b.id}`}`} onClose={onClose}>
        <div className="grid grid-cols-2 gap-4">
            <FL label="Status"><select className={inpW} value={f.status} onChange={e => s('status', e.target.value)}>{['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'].map(x => <option key={x}>{x}</option>)}</select></FL>
            <FL label="Payment Status"><select className={inpW} value={f.payment_status} onChange={e => s('payment_status', e.target.value)}>{['pending', 'paid', 'failed', 'refunded'].map(x => <option key={x}>{x}</option>)}</select></FL>
            <FL label="Scheduled Date"><input type="date" className={inpW} value={f.scheduled_date} onChange={e => s('scheduled_date', e.target.value)} /></FL>
            <FL label="Scheduled Time"><input type="text" className={inpW} placeholder="09:00" value={f.scheduled_time} onChange={e => s('scheduled_time', e.target.value)} /></FL>
            <div className="col-span-2"><FL label="Street Address"><input type="text" className={inpW} value={f.address_street} onChange={e => s('address_street', e.target.value)} /></FL></div>
            <FL label="City"><input type="text" className={inpW} value={f.address_city} onChange={e => s('address_city', e.target.value)} /></FL>
            <FL label="Total Price (SAR)"><input type="number" className={inpW} value={f.total_price} onChange={e => s('total_price', e.target.value)} /></FL>
            <div className="col-span-2"><FL label="Notes"><textarea rows={3} className={inpW} value={f.notes} onChange={e => s('notes', e.target.value)} /></FL></div>
        </div>
        <div className="flex gap-3 mt-6 justify-end">
            <button onClick={onClose} className="px-5 py-2 border border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={() => onSave(f)} className="px-5 py-2 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700">Save Changes</button>
        </div>
    </Modal>
}

// ── Service modal ─────────────────────────────────────────────────────────────
function SModal({ s, onClose, onSave }: { s: Service | null; onClose: () => void; onSave: (d: Partial<Service>) => void }) {
    const [f, setF] = useState<Partial<Service>>(s ?? { is_active: true, category: 'ac', duration_hours: 1 })
    const set = (k: string, v: unknown) => setF(p => ({ ...p, [k]: v }))
    return <Modal title={s ? `Edit — ${s.name_en}` : 'New Service'} onClose={onClose}>
        <div className="grid grid-cols-2 gap-4">
            <FL label="Name (English)"><input type="text" className={inpW} value={f.name_en || ''} onChange={e => set('name_en', e.target.value)} /></FL>
            <FL label="Name (Arabic)"><input type="text" dir="rtl" className={`${inpW} text-right`} value={f.name_ar || ''} onChange={e => set('name_ar', e.target.value)} /></FL>
            <FL label="Category"><select className={inpW} value={f.category || 'ac'} onChange={e => set('category', e.target.value)}>{['ac', 'refrigerator', 'washing_machine', 'oven', 'cold_storage'].map(c => <option key={c}>{c}</option>)}</select></FL>
            <FL label="Base Price (SAR)"><input type="number" className={inpW} value={f.base_price || ''} onChange={e => set('base_price', e.target.value)} /></FL>
            <FL label="Duration (hours)"><input type="number" step="0.5" min="0.5" className={inpW} value={f.duration_hours || 1} onChange={e => set('duration_hours', parseFloat(e.target.value))} /></FL>
            <div className="flex items-center gap-2 pt-5">
                <input type="checkbox" id="svc_a" checked={!!f.is_active} onChange={e => set('is_active', e.target.checked)} className="w-4 h-4 accent-teal-600" />
                <label htmlFor="svc_a" className="text-sm text-gray-700 cursor-pointer font-medium">Active (visible to customers)</label>
            </div>
            <div className="col-span-2"><FL label="Description (English)"><textarea rows={2} className={inpW} value={f.description_en || ''} onChange={e => set('description_en', e.target.value)} /></FL></div>
            <div className="col-span-2"><FL label="Description (Arabic)"><textarea rows={2} dir="rtl" className={`${inpW} text-right`} value={f.description_ar || ''} onChange={e => set('description_ar', e.target.value)} /></FL></div>
        </div>
        <div className="flex gap-3 mt-6 justify-end">
            <button onClick={onClose} className="px-5 py-2 border border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={() => onSave(f)} className="px-5 py-2 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700">{s ? 'Save Changes' : 'Create Service'}</button>
        </div>
    </Modal>
}

// ── User modal ────────────────────────────────────────────────────────────────
function UModal({ u, onClose, onSave }: { u: User; onClose: () => void; onSave: (d: Partial<User>) => void }) {
    const [f, setF] = useState({ ...u }); const s = (k: keyof typeof f, v: unknown) => setF(p => ({ ...p, [k]: v }))
    return <Modal title={`Edit — ${u.username}`} onClose={onClose}>
        <div className="grid grid-cols-2 gap-4">
            <FL label="First Name"><input type="text" className={inpW} value={f.first_name} onChange={e => s('first_name', e.target.value)} /></FL>
            <FL label="Last Name"><input type="text" className={inpW} value={f.last_name} onChange={e => s('last_name', e.target.value)} /></FL>
            <FL label="Email"><input type="email" className={inpW} value={f.email} onChange={e => s('email', e.target.value)} /></FL>
            <FL label="Phone"><input type="tel" className={inpW} value={f.phone} onChange={e => s('phone', e.target.value)} /></FL>
            <FL label="Role"><select className={inpW} value={f.role || 'customer'} onChange={e => s('role', e.target.value)}><option value="customer">Customer</option><option value="technician">Technician</option><option value="admin">Admin</option></select></FL>
            <div className="flex items-center gap-2 pt-5">
                <input type="checkbox" id="usr_a" checked={!!f.is_active} onChange={e => s('is_active', e.target.checked)} className="w-4 h-4 accent-teal-600" />
                <label htmlFor="usr_a" className="text-sm text-gray-700 cursor-pointer font-medium">Active Account</label>
            </div>
        </div>
        <div className="flex gap-3 mt-6 justify-end">
            <button onClick={onClose} className="px-5 py-2 border border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={() => onSave(f)} className="px-5 py-2 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700">Save Changes</button>
        </div>
    </Modal>
}
