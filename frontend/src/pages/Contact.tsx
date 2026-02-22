import { useTranslation } from 'react-i18next'
import { Phone, MessageCircle, MapPin } from 'lucide-react'

export default function Contact() {
  const { t } = useTranslation()

  return (
    <div className="py-12 max-w-4xl mx-auto px-4">
      <h1 className="text-3xl font-bold text-center mb-12">{t('contact.title')}</h1>
      <div className="grid md:grid-cols-3 gap-8">
        <a
          href="tel:0582618038"
          className="flex flex-col items-center p-6 rounded-2xl bg-primary-50 hover:bg-primary-100 transition"
        >
          <Phone className="w-12 h-12 text-primary-600 mb-3" />
          <span className="font-semibold">{t('contact.call')}</span>
          <span className="text-primary-600 mt-1">0582618038</span>
        </a>
        <a
          href="https://wa.me/966582618038"
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center p-6 rounded-2xl bg-green-50 hover:bg-green-100 transition"
        >
          <MessageCircle className="w-12 h-12 text-green-600 mb-3" />
          <span className="font-semibold">{t('contact.whatsapp')}</span>
          <span className="text-green-600 mt-1">0582618038</span>
        </a>
        <div className="flex flex-col items-center p-6 rounded-2xl bg-gray-50">
          <MapPin className="w-12 h-12 text-gray-600 mb-3" />
          <span className="font-semibold">الموقع</span>
          <span className="text-gray-600 mt-1 text-center">الصناعية - الدمام</span>
          <span className="text-gray-500 text-sm mt-1">المملكة العربية السعودية</span>
        </div>
      </div>
    </div>
  )
}
