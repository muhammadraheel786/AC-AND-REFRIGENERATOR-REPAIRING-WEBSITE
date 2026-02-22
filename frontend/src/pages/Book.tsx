import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { servicesApi, bookingsApi } from '../api/client'
import { format, addDays } from 'date-fns'
import { showToast } from '../utils/toast'

function downloadInvoicePdf(bookingId: number, filename: string) {
  return bookingsApi.invoice(bookingId).then((blob) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  })
}

function InvoiceDownloadButton({ bookingId, t }: { bookingId: number; t: (k: string) => string }) {
  const [loading, setLoading] = useState(false)
  const handleClick = async () => {
    setLoading(true)
    try {
      await downloadInvoicePdf(bookingId, `invoice-${bookingId}.pdf`)
    } finally {
      setLoading(false)
    }
  }
  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="w-full py-3 border border-gray-300 rounded-lg"
    >
      {loading ? t('booking.downloadingInvoice') : t('booking.downloadInvoice')}
    </button>
  )
}

const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00',
]

export default function Book() {
  const { t, i18n } = useTranslation()
  const [searchParams] = useSearchParams()
  const presetCategory = searchParams.get('service')

  const [services, setServices] = useState<Array<{ id: number; name: string; category: string }>>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    service_id: 0,
    scheduled_date: '',
    scheduled_time: '',
    address_street: '',
    address_city: 'Dammam',
    address_lat: null as number | null,
    address_lng: null as number | null,
    notes: '',
    customer_name: '',
    phone: '',
    whatsapp: '',
    email: '',
  })
  const [bookingResult, setBookingResult] = useState<{
    id: number
    token?: string
  } | null>(null)
  const [error, setError] = useState('')
  const [locationLoading, setLocationLoading] = useState(false)
  const [locationStatus, setLocationStatus] = useState('')
  const [manualLat, setManualLat] = useState('')
  const [manualLng, setManualLng] = useState('')
  const [invoiceAutoDownloadDone, setInvoiceAutoDownloadDone] = useState(false)
  const isLoggedIn = !!localStorage.getItem('token')

  // Auto-download invoice when booking is created (step 3)
  useEffect(() => {
    if (!bookingResult?.id || invoiceAutoDownloadDone) return
    setInvoiceAutoDownloadDone(true)
    downloadInvoicePdf(bookingResult.id, `invoice-${bookingResult.id}.pdf`).catch(() => {})
  }, [bookingResult?.id, invoiceAutoDownloadDone])

  useEffect(() => {
    const loadServices = async () => {
      try {
        const data = await servicesApi.list({ lang: i18n.language })
        setServices(Array.isArray(data) ? data : [])
      } catch (err) {
        setError('Failed to load services')
        setServices([])
      } finally {
        setLoading(false)
      }
    }
    loadServices()
  }, [i18n.language])

  useEffect(() => {
    if (presetCategory && services.length > 0) {
      const svc = services.find((s) => s.category === presetCategory)
      if (svc && svc.id) {
        setForm((f) => ({ ...f, service_id: svc.id }))
      }
    }
  }, [presetCategory, services])

  const setCoordsOnForm = (lat: number, lng: number) => {
    const latRounded = Number(lat.toFixed(7))
    const lngRounded = Number(lng.toFixed(7))
    setForm((f) => ({
      ...f,
      address_lat: latRounded,
      address_lng: lngRounded,
      address_street: f.address_street || `${latRounded.toFixed(6)}, ${lngRounded.toFixed(6)}`,
    }))
  }

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus(t('booking.locationNotSupported'))
      return
    }
    setLocationLoading(true)
    setLocationStatus('')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        setCoordsOnForm(lat, lng)
        setManualLat(String(lat))
        setManualLng(String(lng))
        setLocationStatus(t('booking.locationCaptured'))
        setLocationLoading(false)
      },
      () => {
        setLocationStatus(t('booking.locationDenied'))
        setLocationLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  }

  const handleApplyManualLocation = () => {
    const lat = Number(manualLat)
    const lng = Number(manualLng)
    const latOk = Number.isFinite(lat) && lat >= -90 && lat <= 90
    const lngOk = Number.isFinite(lng) && lng >= -180 && lng <= 180
    if (!latOk || !lngOk) {
      setLocationStatus(t('booking.locationInvalid'))
      return
    }
    setCoordsOnForm(lat, lng)
    setLocationStatus(t('booking.locationCaptured'))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const token = localStorage.getItem('token')
      if (token) {
        const data = await bookingsApi.create({
          service_id: form.service_id,
          scheduled_date: form.scheduled_date,
          scheduled_time: form.scheduled_time,
          address_street: form.address_street,
          address_city: form.address_city,
          address_lat: form.address_lat,
          address_lng: form.address_lng,
          notes: form.notes,
        })
        if (data?.id) {
          setBookingResult({ id: Number(data.id) })
          showToast(t('booking.bookingSuccessToast'), 'success')
          setStep(3)
        } else {
          setError(t('booking.receiptNotReady'))
        }
      } else {
        const data = await bookingsApi.createGuest({
          service_id: form.service_id,
          scheduled_date: form.scheduled_date,
          scheduled_time: form.scheduled_time,
          address_street: form.address_street,
          address_city: form.address_city,
          address_lat: form.address_lat,
          address_lng: form.address_lng,
          notes: form.notes,
          customer_name: form.customer_name,
          phone: form.phone,
          whatsapp: form.whatsapp || form.phone,
          email: form.email,
        })
        if (data.token) {
          localStorage.setItem('token', data.token)
          window.dispatchEvent(new CustomEvent('auth-change'))
        }
        setBookingResult({ id: data.id, token: data.token })
        showToast(t('booking.bookingSuccessToast'), 'success')
        setStep(3)
      }
    } catch (err: unknown) {
      const ax = err as { response?: { data?: unknown } }
      const msg = ax?.response?.data
      const errMsg = typeof msg === 'object' && msg && 'detail' in msg
        ? String((msg as { detail: unknown }).detail)
        : typeof msg === 'object' && msg
          ? JSON.stringify(msg)
          : 'Failed to create booking'
      setError(errMsg)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="py-12 max-w-2xl mx-auto px-4">
      <h1 className="text-2xl font-bold mb-8">{t('booking.title')}</h1>

      {step === 1 && (
        <div className="space-y-4">
          <label className="block font-medium">{t('booking.selectService')}</label>
          <select
            className="w-full px-4 py-3 rounded-lg border border-gray-300"
            value={form.service_id}
            onChange={(e) => setForm((f) => ({ ...f, service_id: parseInt(e.target.value, 10) }))}
          >
            <option value={0}>-- {t('booking.selectServicePlaceholder')} --</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => setStep(2)}
            disabled={!form.service_id}
            className="w-full py-3 bg-primary-600 text-white rounded-lg font-medium disabled:opacity-50"
          >
            {t('booking.next')}
          </button>
        </div>
      )}

      {step === 2 && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLoggedIn && (
            <>
              <div>
                <label className="block font-medium mb-1">{t('booking.customerName')}</label>
                <input
                  type="text"
                  required
                  placeholder={i18n.language === 'ar' ? 'الاسم الكامل' : 'Full name'}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300"
                  value={form.customer_name}
                  onChange={(e) => setForm((f) => ({ ...f, customer_name: e.target.value }))}
                />
              </div>
              <div>
                <label className="block font-medium mb-1">{t('booking.phone')}</label>
                <input
                  type="tel"
                  required
                  placeholder="05xxxxxxxx"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div>
                <label className="block font-medium mb-1">{t('booking.whatsapp')}</label>
                <input
                  type="tel"
                  placeholder={i18n.language === 'ar' ? 'نفس الرقم أو مختلف' : 'Same or different'}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300"
                  value={form.whatsapp}
                  onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))}
                />
              </div>
              <div>
                <label className="block font-medium mb-1">{t('booking.email')}</label>
                <input
                  type="email"
                  placeholder="example@email.com"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
            </>
          )}
          <div>
            <label className="block font-medium mb-1">{t('booking.selectDate')}</label>
            <input
              type="date"
              required
              min={format(addDays(new Date(), 1), 'yyyy-MM-dd')}
              className="w-full px-4 py-3 rounded-lg border border-gray-300"
              value={form.scheduled_date}
              onChange={(e) => setForm((f) => ({ ...f, scheduled_date: e.target.value }))}
            />
          </div>
          <div>
            <label className="block font-medium mb-1">{t('booking.selectTime')}</label>
            <select
              required
              className="w-full px-4 py-3 rounded-lg border border-gray-300"
              value={form.scheduled_time}
              onChange={(e) => setForm((f) => ({ ...f, scheduled_time: e.target.value }))}
            >
              <option value="">-- {t('booking.selectTime')} --</option>
              {TIME_SLOTS.map((slot) => (
                <option key={slot} value={slot}>{slot}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-medium mb-1">{t('booking.address')}</label>
            <input
              type="text"
              required
              placeholder={i18n.language === 'ar' ? 'العنوان الكامل أو اختيار الموقع' : 'Full address or pick on map'}
              className="w-full px-4 py-3 rounded-lg border border-gray-300"
              value={form.address_street}
              onChange={(e) => setForm((f) => ({ ...f, address_street: e.target.value }))}
            />
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={locationLoading}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                {locationLoading ? t('booking.locationLoading') : t('booking.useCurrentLocation')}
              </button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <input
                type="number"
                step="any"
                placeholder={t('booking.latitude')}
                className="w-full px-3 py-2 rounded-lg border border-gray-300"
                value={manualLat}
                onChange={(e) => setManualLat(e.target.value)}
              />
              <input
                type="number"
                step="any"
                placeholder={t('booking.longitude')}
                className="w-full px-3 py-2 rounded-lg border border-gray-300"
                value={manualLng}
                onChange={(e) => setManualLng(e.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={handleApplyManualLocation}
              className="mt-2 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              {t('booking.applyManualLocation')}
            </button>
            {(form.address_lat !== null && form.address_lng !== null) && (
              <p className="text-xs text-gray-600 mt-2">
                {t('booking.selectedCoordinates')}: {form.address_lat.toFixed(6)}, {form.address_lng.toFixed(6)}
              </p>
            )}
            {locationStatus && <p className="text-xs text-gray-600 mt-1">{locationStatus}</p>}
          </div>
          <div>
            <label className="block font-medium mb-1">{t('booking.notes')}</label>
            <textarea
              rows={3}
              className="w-full px-4 py-3 rounded-lg border border-gray-300"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder={i18n.language === 'ar' ? 'أي ملاحظات إضافية' : 'Any extra notes'}
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 py-3 border border-gray-300 rounded-lg"
            >
              {t('booking.back')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 bg-primary-600 text-white rounded-lg font-medium disabled:opacity-50"
            >
              {submitting ? (i18n.language === 'ar' ? 'جاري الحجز...' : 'Booking...') : t('booking.submit')}
            </button>
          </div>
        </form>
      )}

      {step === 3 && bookingResult && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <h2 className="text-xl font-bold text-green-800 mb-2">{t('booking.bookingSuccess')}</h2>
          <p className="text-gray-700">
            {t('booking.bookingRef')} #{bookingResult.id}
          </p>
          <p className="text-sm text-gray-600 mt-2">{t('booking.confirmSent')}</p>
          <p className="text-sm text-gray-600">{t('booking.amountInInvoice')}</p>
          <div className="mt-6 flex flex-col gap-2">
            <InvoiceDownloadButton bookingId={bookingResult.id} t={t} />
            <Link to="/my-bookings" className="w-full py-3 text-primary-600 text-center">
              {t('booking.myBookings')}
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
