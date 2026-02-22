import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { FileText } from 'lucide-react'
import { bookingsApi } from '../api/client'

function InvoiceDownloadButton({ bookingId }: { bookingId: number }) {
  const [loading, setLoading] = useState(false)
  const handleClick = async () => {
    setLoading(true)
    try {
      const blob = await bookingsApi.invoice(bookingId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `invoice-${bookingId}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setLoading(false)
    }
  }
  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="p-2 rounded-lg bg-primary-100 text-primary-600 hover:bg-primary-200"
    >
      <FileText size={20} />
    </button>
  )
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'قيد الانتظار',
  confirmed: 'مؤكد',
  in_progress: 'قيد التنفيذ',
  completed: 'مكتمل',
  cancelled: 'ملغى',
}

export default function MyBookings() {
  const { t } = useTranslation()
  const [bookings, setBookings] = useState<Array<{
    id: number
    service_name: string
    scheduled_date: string
    scheduled_time: string
    status: string
    payment_status: string
    total_price: string
  }>>([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      window.location.href = '/login?redirect=/my-bookings'
      return
    }
    setListError(null)
    bookingsApi
      .list()
      .then((data) => {
        setBookings(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        setBookings([])
        setListError('فشل تحميل الحجوزات. يرجى المحاولة لاحقاً.')
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="py-12 max-w-3xl mx-auto px-4">
      <h1 className="text-2xl font-bold mb-8">حجوزاتي</h1>
      {listError && (
        <div className="mb-4 p-4 rounded-xl bg-amber-50 text-amber-800 border border-amber-200">
          {listError}
        </div>
      )}
      {bookings.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <p className="text-gray-600">{listError ? '' : 'لا توجد حجوزات'}</p>
          <Link to="/book" className="inline-block mt-4 text-primary-600 font-medium">
            احجز الآن
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => (
            <div
              key={b.id}
              className="p-4 rounded-xl border border-gray-200 bg-white flex justify-between items-center"
            >
              <div>
                <p className="font-semibold">{b.service_name}</p>
                <p className="text-sm text-gray-600">
                  {format(new Date(b.scheduled_date), 'yyyy-MM-dd')} - {b.scheduled_time}
                </p>
                <p className="text-sm">
                  <span className={b.payment_status === 'paid' ? 'text-green-600' : 'text-amber-600'}>
                    {b.payment_status === 'paid' ? 'مدفوع' : 'لم يدفع'}
                  </span>
                  {' | '}
                  {STATUS_LABELS[b.status] || b.status}
                </p>
              </div>
              <div className="flex gap-2">
                <InvoiceDownloadButton bookingId={b.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
