import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'

// Types
type Booking = {
    id: number; invoice_number: string; customer_name: string; customer_phone: string;
    service_name: string; scheduled_date: string; scheduled_time: string;
    status: string; payment_status: string; total_price: string;
    address_street: string; address_city: string; notes: string; created_at: string;
}
type Service = {
    id: number; name_en: string; name_ar: string; category: string;
    base_price: string; duration_hours: number; is_active: boolean;
}
type User = {
    id: number; username: string; first_name: string; last_name: string;
    email: string; phone: string; role: string; is_active: boolean; date_joined: string;
}
type Stats = {
    bookings: { total: number; pending: number; confirmed: number; completed: number };
    users: { total: number }; services: { total: number; active: number };
    recent_bookings: Booking[];
}

const STATUS_COLORS: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800',
    confirmed: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-purple-100 text-purple-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
}
const PAY_COLORS: Record<string, string> = {
    pending: 'bg-orange-100 text-orange-800',
    paid: 'bg-emerald-100 text-emerald-800',
    failed: 'bg-red-100 text-red-800',
    refunded: 'bg-gray-100 text-gray-800',
}

// Reusable Modal
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b">
                    <h3 className="text-lg font-bold text-gray-800">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
                </div>
                <div className="p-6">{children}</div>
            </div>
        </div>
    )
}

// Confirm dialog
function ConfirmDelete({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center">
                <div className="text-5xl mb-4">⚠️</div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">Confirm Delete</h3>
                <p className="text-gray-500 mb-6 text-sm">{message}</p>
                <div className="flex gap-3 justify-center">
                    <button onClick={onCancel} className="px-6 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</button>
                    <button onClick={onConfirm} className="px-6 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700">Delete</button>
                </div>
            </div>
        </div>
    )
}

export default function AdminPanel() {
    const navigate = useNavigate()
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
    const [confirmDelete, setConfirmDelete] = useState<{ type: string; id: number; msg: string } | null>(null)
    const [toast, setToast] = useState('')

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

    // Auth guard
    useEffect(() => {
        const token = localStorage.getItem('token')
        if (!token) { navigate('/login'); return }
    }, [navigate])

    const loadStats = useCallback(async () => {
        try { const r = await api.get('/api/admin/stats/'); setStats(r.data) } catch { /* ignore */ }
    }, [])

    const loadBookings = useCallback(async () => {
        setLoading(true)
        try {
            const r = await api.get('/api/admin/bookings/', { params: { page: bPage, per_page: 15, search: bSearch, status: bStatus } })
            setBookings(r.data.results || [])
            setBTotal(r.data.total || 0)
        } catch { setBookings([]) } finally { setLoading(false) }
    }, [bPage, bSearch, bStatus])

    const loadServices = useCallback(async () => {
        try { const r = await api.get('/api/admin/services/'); setServices(r.data || []) } catch { setServices([]) }
    }, [])

    const loadUsers = useCallback(async () => {
        setLoading(true)
        try {
            const r = await api.get('/api/admin/users/', { params: { page: uPage, per_page: 15, search: uSearch } })
            setUsers(r.data.results || [])
            setUTotal(r.data.total || 0)
        } catch { setUsers([]) } finally { setLoading(false) }
    }, [uPage, uSearch])

    useEffect(() => { loadStats() }, [loadStats])
    useEffect(() => { if (tab === 'bookings') loadBookings() }, [tab, loadBookings])
    useEffect(() => { if (tab === 'services') loadServices() }, [tab, loadServices])
    useEffect(() => { if (tab === 'users') loadUsers() }, [tab, loadUsers])

    // Booking actions
    const saveBooking = async (data: Partial<Booking>) => {
        try {
            await api.put(`/api/admin/bookings/${editBooking!.id}/`, data)
            showToast('✅ Booking updated successfully')
            setEditBooking(null)
            loadBookings()
        } catch { showToast('❌ Failed to update booking') }
    }
    const deleteBooking = async (id: number) => {
        try {
            await api.delete(`/api/admin/bookings/${id}/`)
            showToast('🗑️ Booking deleted')
            setConfirmDelete(null)
            loadBookings()
        } catch { showToast('❌ Failed to delete') }
    }

    // Service actions
    const saveService = async (data: Partial<Service>) => {
        try {
            if (newService) {
                await api.post('/api/admin/services/', data)
                showToast('✅ Service created')
                setNewService(false)
            } else {
                await api.put(`/api/admin/services/${editService!.id}/`, data)
                showToast('✅ Service updated')
                setEditService(null)
            }
            loadServices()
        } catch { showToast('❌ Failed to save service') }
    }
    const deleteService = async (id: number) => {
        try {
            await api.delete(`/api/admin/services/${id}/`)
            showToast('🗑️ Service deleted')
            setConfirmDelete(null)
            loadServices()
        } catch { showToast('❌ Failed to delete') }
    }

    // User actions
    const saveUser = async (data: Partial<User>) => {
        try {
            await api.put(`/api/admin/users/${editUser!.id}/`, data)
            showToast('✅ User updated')
            setEditUser(null)
            loadUsers()
        } catch { showToast('❌ Failed to update user') }
    }
    const deleteUser = async (id: number) => {
        try {
            await api.delete(`/api/admin/users/${id}/`)
            showToast('🗑️ User deleted')
            setConfirmDelete(null)
            loadUsers()
        } catch { showToast('❌ Failed to delete') }
    }

    const tabs = [
        { id: 'dashboard', label: 'Dashboard', icon: '📊' },
        { id: 'bookings', label: 'Bookings', icon: '📋' },
        { id: 'services', label: 'Services', icon: '🔧' },
        { id: 'users', label: 'Users', icon: '👥' },
    ]

    return (
        <div className="min-h-screen bg-gray-950 text-white">
            {/* Toast */}
            {toast && (
                <div className="fixed top-4 right-4 z-50 bg-gray-800 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium animate-fade-in">
                    {toast}
                </div>
            )}

            {/* Sidebar */}
            <div className="fixed left-0 top-0 bottom-0 w-60 bg-gray-900 border-r border-gray-800 flex flex-col z-40">
                <div className="p-6 border-b border-gray-800">
                    <h1 className="font-bold text-lg text-teal-400">⚙️ Admin Panel</h1>
                    <p className="text-xs text-gray-500 mt-1">AC & Refrigeration</p>
                </div>
                <nav className="p-4 flex-1 space-y-1">
                    {tabs.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id as typeof tab)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${tab === t.id
                                    ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                                }`}
                        >
                            <span>{t.icon}</span> {t.label}
                            {t.id === 'bookings' && stats && <span className="ml-auto bg-teal-500 text-xs text-white px-2 py-0.5 rounded-full">{stats.bookings.pending}</span>}
                        </button>
                    ))}
                </nav>
                <div className="p-4 border-t border-gray-800">
                    <button
                        onClick={() => { localStorage.removeItem('token'); navigate('/') }}
                        className="w-full text-left text-sm text-gray-500 hover:text-red-400 px-4 py-2"
                    >
                        🚪 Logout
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="ml-60 p-8">

                {/* ─── DASHBOARD ─── */}
                {tab === 'dashboard' && (
                    <div>
                        <h2 className="text-2xl font-bold mb-6">Dashboard</h2>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                            {[
                                { label: 'Total Bookings', value: stats?.bookings.total ?? '…', icon: '📋', color: 'from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-400' },
                                { label: 'Pending', value: stats?.bookings.pending ?? '…', icon: '⏳', color: 'from-amber-500/20 to-amber-600/10 border-amber-500/30 text-amber-400' },
                                { label: 'Completed', value: stats?.bookings.completed ?? '…', icon: '✅', color: 'from-green-500/20 to-green-600/10 border-green-500/30 text-green-400' },
                                { label: 'Total Users', value: stats?.users.total ?? '…', icon: '👥', color: 'from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-400' },
                            ].map(s => (
                                <div key={s.label} className={`bg-gradient-to-br ${s.color} border rounded-2xl p-5`}>
                                    <div className="text-3xl mb-2">{s.icon}</div>
                                    <div className={`text-3xl font-bold ${s.color.split(' ').at(-1)}`}>{String(s.value)}</div>
                                    <div className="text-gray-400 text-sm mt-1">{s.label}</div>
                                </div>
                            ))}
                        </div>

                        {/* Recent Bookings */}
                        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
                            <div className="p-5 border-b border-gray-800">
                                <h3 className="font-bold text-gray-200">Recent Bookings</h3>
                            </div>
                            <table className="w-full text-sm">
                                <thead><tr className="border-b border-gray-800 text-gray-500">
                                    {['Invoice', 'Customer', 'Service', 'Date', 'Status'].map(h => (
                                        <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                                    ))}
                                </tr></thead>
                                <tbody>
                                    {(stats?.recent_bookings || []).map(b => (
                                        <tr key={b.id} className="border-b border-gray-800/50 hover:bg-gray-800/40 transition-colors">
                                            <td className="px-4 py-3 font-mono text-teal-400">{b.invoice_number || `#${b.id}`}</td>
                                            <td className="px-4 py-3">{b.customer_name || '-'}</td>
                                            <td className="px-4 py-3 text-gray-400">{b.service_name || '-'}</td>
                                            <td className="px-4 py-3 text-gray-400">{b.scheduled_date}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded-lg text-xs font-medium ${STATUS_COLORS[b.status] || 'bg-gray-700 text-gray-300'}`}>{b.status}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ─── BOOKINGS ─── */}
                {tab === 'bookings' && (
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold">Bookings <span className="text-gray-500 text-lg font-normal">({bTotal})</span></h2>
                        </div>
                        {/* Filters */}
                        <div className="flex gap-3 mb-5">
                            <input
                                className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-teal-500 outline-none"
                                placeholder="Search invoice or address…"
                                value={bSearch}
                                onChange={e => { setBSearch(e.target.value); setBPage(1) }}
                            />
                            <select
                                className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-300 focus:border-teal-500 outline-none"
                                value={bStatus}
                                onChange={e => { setBStatus(e.target.value); setBPage(1) }}
                            >
                                <option value="">All Statuses</option>
                                {['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <button onClick={loadBookings} className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 rounded-xl text-sm font-medium transition-colors">
                                🔄 Refresh
                            </button>
                        </div>

                        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
                            <table className="w-full text-sm">
                                <thead><tr className="border-b border-gray-800 text-gray-500">
                                    {['Invoice', 'Customer', 'Service', 'Date / Time', 'Status', 'Payment', 'Price', 'Actions'].map(h => (
                                        <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                                    ))}
                                </tr></thead>
                                <tbody>
                                    {loading && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">Loading…</td></tr>}
                                    {!loading && bookings.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">No bookings found</td></tr>}
                                    {bookings.map(b => (
                                        <tr key={b.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                                            <td className="px-4 py-3 font-mono text-teal-400 text-xs">{b.invoice_number || `#${b.id}`}</td>
                                            <td className="px-4 py-3">
                                                <div className="font-medium">{b.customer_name || '-'}</div>
                                                <div className="text-xs text-gray-500">{b.customer_phone}</div>
                                            </td>
                                            <td className="px-4 py-3 text-gray-300 max-w-[120px] truncate">{b.service_name || '-'}</td>
                                            <td className="px-4 py-3 text-gray-400 text-xs">{b.scheduled_date}<br />{b.scheduled_time}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded-lg text-xs font-medium ${STATUS_COLORS[b.status] || 'bg-gray-700 text-gray-300'}`}>{b.status}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded-lg text-xs font-medium ${PAY_COLORS[b.payment_status] || 'bg-gray-700 text-gray-300'}`}>{b.payment_status}</span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-300">{b.total_price} SAR</td>
                                            <td className="px-4 py-3">
                                                <div className="flex gap-2">
                                                    <button onClick={() => setEditBooking(b)} className="px-3 py-1.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg text-xs font-medium transition-colors">✏️ Edit</button>
                                                    <button onClick={() => setConfirmDelete({ type: 'booking', id: b.id, msg: `Delete booking ${b.invoice_number || b.id}?` })} className="px-3 py-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg text-xs font-medium transition-colors">🗑️</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="flex items-center justify-between mt-4">
                            <p className="text-sm text-gray-500">Showing {bookings.length} of {bTotal}</p>
                            <div className="flex gap-2">
                                <button disabled={bPage === 1} onClick={() => setBPage(p => p - 1)} className="px-4 py-2 bg-gray-800 rounded-lg text-sm disabled:opacity-40">← Prev</button>
                                <span className="px-4 py-2 text-sm text-gray-400">Page {bPage}</span>
                                <button disabled={bPage * 15 >= bTotal} onClick={() => setBPage(p => p + 1)} className="px-4 py-2 bg-gray-800 rounded-lg text-sm disabled:opacity-40">Next →</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ─── SERVICES ─── */}
                {tab === 'services' && (
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold">Services</h2>
                            <button onClick={() => setNewService(true)} className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 rounded-xl text-sm font-medium transition-colors">
                                + Add Service
                            </button>
                        </div>
                        <div className="grid gap-4">
                            {services.map(s => (
                                <div key={s.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex items-center justify-between hover:border-gray-700 transition-colors">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-1">
                                            <h3 className="font-semibold">{s.name_en}</h3>
                                            <span className="text-xs text-gray-500">{s.name_ar}</span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${s.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                                {s.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-gray-400">
                                            <span>📂 {s.category}</span>
                                            <span>💰 {s.base_price} SAR</span>
                                            <span>⏱️ {s.duration_hours}h</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 ml-4">
                                        <button onClick={() => setEditService(s)} className="px-4 py-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-xl text-sm font-medium transition-colors">✏️ Edit</button>
                                        <button onClick={() => setConfirmDelete({ type: 'service', id: s.id, msg: `Delete service "${s.name_en}"?` })} className="px-4 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-xl text-sm font-medium transition-colors">🗑️ Delete</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ─── USERS ─── */}
                {tab === 'users' && (
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold">Users <span className="text-gray-500 text-lg font-normal">({uTotal})</span></h2>
                        </div>
                        <div className="flex gap-3 mb-5">
                            <input
                                className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-teal-500 outline-none"
                                placeholder="Search by name, phone, email…"
                                value={uSearch}
                                onChange={e => { setUSearch(e.target.value); setUPage(1) }}
                            />
                            <button onClick={loadUsers} className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 rounded-xl text-sm font-medium transition-colors">🔄 Refresh</button>
                        </div>
                        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
                            <table className="w-full text-sm">
                                <thead><tr className="border-b border-gray-800 text-gray-500">
                                    {['Name', 'Username', 'Phone', 'Email', 'Role', 'Status', 'Joined', 'Actions'].map(h => (
                                        <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                                    ))}
                                </tr></thead>
                                <tbody>
                                    {loading && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">Loading…</td></tr>}
                                    {users.map(u => (
                                        <tr key={u.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="font-medium">{u.first_name} {u.last_name}</div>
                                            </td>
                                            <td className="px-4 py-3 text-gray-400">{u.username}</td>
                                            <td className="px-4 py-3 text-gray-400">{u.phone || '-'}</td>
                                            <td className="px-4 py-3 text-gray-400 max-w-[150px] truncate">{u.email || '-'}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded-lg text-xs font-medium ${u.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-700 text-gray-300'}`}>{u.role || 'customer'}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded-lg text-xs ${u.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{u.is_active ? 'Active' : 'Inactive'}</span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-500 text-xs">{u.date_joined?.slice(0, 10) || '-'}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex gap-2">
                                                    <button onClick={() => setEditUser(u)} className="px-3 py-1.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg text-xs font-medium transition-colors">✏️</button>
                                                    <button onClick={() => setConfirmDelete({ type: 'user', id: u.id, msg: `Delete user "${u.username}"? This cannot be undone.` })} className="px-3 py-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg text-xs font-medium transition-colors">🗑️</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex items-center justify-between mt-4">
                            <p className="text-sm text-gray-500">Showing {users.length} of {uTotal}</p>
                            <div className="flex gap-2">
                                <button disabled={uPage === 1} onClick={() => setUPage(p => p - 1)} className="px-4 py-2 bg-gray-800 rounded-lg text-sm disabled:opacity-40">← Prev</button>
                                <span className="px-4 py-2 text-sm text-gray-400">Page {uPage}</span>
                                <button disabled={uPage * 15 >= uTotal} onClick={() => setUPage(p => p + 1)} className="px-4 py-2 bg-gray-800 rounded-lg text-sm disabled:opacity-40">Next →</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ─── EDIT BOOKING MODAL ─── */}
            {editBooking && (
                <EditBookingModal booking={editBooking} onClose={() => setEditBooking(null)} onSave={saveBooking} />
            )}

            {/* ─── EDIT SERVICE MODAL ─── */}
            {(editService || newService) && (
                <EditServiceModal
                    service={editService}
                    onClose={() => { setEditService(null); setNewService(false) }}
                    onSave={saveService}
                />
            )}

            {/* ─── EDIT USER MODAL ─── */}
            {editUser && (
                <EditUserModal user={editUser} onClose={() => setEditUser(null)} onSave={saveUser} />
            )}

            {/* ─── CONFIRM DELETE ─── */}
            {confirmDelete && (
                <ConfirmDelete
                    message={confirmDelete.msg}
                    onCancel={() => setConfirmDelete(null)}
                    onConfirm={() => {
                        if (confirmDelete.type === 'booking') deleteBooking(confirmDelete.id)
                        if (confirmDelete.type === 'service') deleteService(confirmDelete.id)
                        if (confirmDelete.type === 'user') deleteUser(confirmDelete.id)
                    }}
                />
            )}
        </div>
    )
}

// ─── BOOKING EDIT MODAL ─────────────────────────────────────────────────────
function EditBookingModal({ booking, onClose, onSave }: { booking: Booking; onClose: () => void; onSave: (data: Partial<Booking>) => void }) {
    const [form, setForm] = useState({ ...booking })
    const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }))
    return (
        <Modal title={`Edit Booking — ${booking.invoice_number || `#${booking.id}`}`} onClose={onClose}>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm text-gray-600 mb-1">Status</label>
                    <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.status} onChange={e => set('status', e.target.value)}>
                        {['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm text-gray-600 mb-1">Payment Status</label>
                    <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.payment_status} onChange={e => set('payment_status', e.target.value)}>
                        {['pending', 'paid', 'failed', 'refunded'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm text-gray-600 mb-1">Scheduled Date</label>
                    <input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.scheduled_date} onChange={e => set('scheduled_date', e.target.value)} />
                </div>
                <div>
                    <label className="block text-sm text-gray-600 mb-1">Scheduled Time</label>
                    <input type="text" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.scheduled_time} onChange={e => set('scheduled_time', e.target.value)} />
                </div>
                <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Address</label>
                    <input type="text" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.address_street} onChange={e => set('address_street', e.target.value)} />
                </div>
                <div>
                    <label className="block text-sm text-gray-600 mb-1">City</label>
                    <input type="text" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.address_city} onChange={e => set('address_city', e.target.value)} />
                </div>
                <div>
                    <label className="block text-sm text-gray-600 mb-1">Total Price (SAR)</label>
                    <input type="number" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.total_price} onChange={e => set('total_price', e.target.value)} />
                </div>
                <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Notes</label>
                    <textarea rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.notes} onChange={e => set('notes', e.target.value)} />
                </div>
            </div>
            <div className="flex gap-3 mt-6 justify-end">
                <button onClick={onClose} className="px-5 py-2 border border-gray-200 rounded-xl text-sm">Cancel</button>
                <button onClick={() => onSave(form)} className="px-5 py-2 bg-teal-600 text-white rounded-xl text-sm hover:bg-teal-700">Save Changes</button>
            </div>
        </Modal>
    )
}

// ─── SERVICE EDIT MODAL ──────────────────────────────────────────────────────
function EditServiceModal({ service, onClose, onSave }: { service: Service | null; onClose: () => void; onSave: (data: Partial<Service>) => void }) {
    const [form, setForm] = useState<Partial<Service>>(service ?? { is_active: true, category: 'ac', duration_hours: 1 })
    const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))
    return (
        <Modal title={service ? `Edit — ${service.name_en}` : 'Add New Service'} onClose={onClose}>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm text-gray-600 mb-1">Name (English)</label>
                    <input type="text" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.name_en || ''} onChange={e => set('name_en', e.target.value)} />
                </div>
                <div>
                    <label className="block text-sm text-gray-600 mb-1">Name (Arabic)</label>
                    <input type="text" dir="rtl" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.name_ar || ''} onChange={e => set('name_ar', e.target.value)} />
                </div>
                <div>
                    <label className="block text-sm text-gray-600 mb-1">Category</label>
                    <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.category || 'ac'} onChange={e => set('category', e.target.value)}>
                        {['ac', 'refrigerator', 'washing_machine', 'oven', 'cold_storage'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm text-gray-600 mb-1">Base Price (SAR)</label>
                    <input type="number" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.base_price || ''} onChange={e => set('base_price', e.target.value)} />
                </div>
                <div>
                    <label className="block text-sm text-gray-600 mb-1">Duration (hours)</label>
                    <input type="number" step="0.5" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.duration_hours || 1} onChange={e => set('duration_hours', parseFloat(e.target.value))} />
                </div>
                <div className="flex items-center gap-2 pt-6">
                    <input type="checkbox" id="is_active" checked={!!form.is_active} onChange={e => set('is_active', e.target.checked)} className="w-4 h-4 accent-teal-600" />
                    <label htmlFor="is_active" className="text-sm text-gray-600">Active (visible to customers)</label>
                </div>
                <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Description (English)</label>
                    <textarea rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.description_en || ''} onChange={e => set('description_en', e.target.value)} />
                </div>
                <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Description (Arabic)</label>
                    <textarea rows={2} dir="rtl" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.description_ar || ''} onChange={e => set('description_ar', e.target.value)} />
                </div>
            </div>
            <div className="flex gap-3 mt-6 justify-end">
                <button onClick={onClose} className="px-5 py-2 border border-gray-200 rounded-xl text-sm">Cancel</button>
                <button onClick={() => onSave(form)} className="px-5 py-2 bg-teal-600 text-white rounded-xl text-sm hover:bg-teal-700">
                    {service ? 'Save Changes' : 'Create Service'}
                </button>
            </div>
        </Modal>
    )
}

// ─── USER EDIT MODAL ─────────────────────────────────────────────────────────
function EditUserModal({ user, onClose, onSave }: { user: User; onClose: () => void; onSave: (data: Partial<User>) => void }) {
    const [form, setForm] = useState({ ...user })
    const set = (k: keyof typeof form, v: unknown) => setForm((f) => ({ ...f, [k]: v }))
    return (
        <Modal title={`Edit User — ${user.username}`} onClose={onClose}>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm text-gray-600 mb-1">First Name</label>
                    <input type="text" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.first_name} onChange={e => set('first_name', e.target.value)} />
                </div>
                <div>
                    <label className="block text-sm text-gray-600 mb-1">Last Name</label>
                    <input type="text" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.last_name} onChange={e => set('last_name', e.target.value)} />
                </div>
                <div>
                    <label className="block text-sm text-gray-600 mb-1">Email</label>
                    <input type="email" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.email} onChange={e => set('email', e.target.value)} />
                </div>
                <div>
                    <label className="block text-sm text-gray-600 mb-1">Phone</label>
                    <input type="text" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.phone} onChange={e => set('phone', e.target.value)} />
                </div>
                <div>
                    <label className="block text-sm text-gray-600 mb-1">Role</label>
                    <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.role || 'customer'} onChange={e => set('role', e.target.value)}>
                        <option value="customer">Customer</option>
                        <option value="technician">Technician</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>
                <div className="flex items-center gap-2 pt-6">
                    <input type="checkbox" id="is_active_user" checked={!!form.is_active} onChange={e => set('is_active', e.target.checked)} className="w-4 h-4 accent-teal-600" />
                    <label htmlFor="is_active_user" className="text-sm text-gray-600">Active Account</label>
                </div>
            </div>
            <div className="flex gap-3 mt-6 justify-end">
                <button onClick={onClose} className="px-5 py-2 border border-gray-200 rounded-xl text-sm">Cancel</button>
                <button onClick={() => onSave(form)} className="px-5 py-2 bg-teal-600 text-white rounded-xl text-sm hover:bg-teal-700">Save Changes</button>
            </div>
        </Modal>
    )
}
