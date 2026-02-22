import { useSearchParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function BookingStatus() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const tranRef = searchParams.get('tran_ref')
  const status = tranRef ? 'success' : 'failed'

  return (
    <div className="py-16 max-w-md mx-auto px-4 text-center">
      {status === 'success' && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-8">
          <h1 className="text-2xl font-bold text-green-800 mb-2">{t('payment.success')}</h1>
          <p className="text-gray-700">{t('payment.thankYou')}</p>
          <Link to="/my-bookings" className="inline-block mt-6 text-primary-600 font-medium">
            {t('payment.viewBookings')}
          </Link>
        </div>
      )}
      {status === 'failed' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-8">
          <h1 className="text-2xl font-bold text-red-800 mb-2">{t('payment.failed')}</h1>
          <p className="text-gray-700">{t('payment.tryAgain')}</p>
          <Link to="/book" className="inline-block mt-6 text-primary-600 font-medium">
            {t('payment.backToBook')}
          </Link>
        </div>
      )}
    </div>
  )
}
