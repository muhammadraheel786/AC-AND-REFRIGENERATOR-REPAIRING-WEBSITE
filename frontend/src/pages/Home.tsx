import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Wind, Thermometer, WashingMachine, Wrench, ChevronLeft } from 'lucide-react'

export default function Home() {
  const { t } = useTranslation()

  const services = [
    { icon: Wind, key: 'ac', to: '/book?service=ac' },
    { icon: Thermometer, key: 'refrigerator', to: '/book?service=refrigerator' },
    { icon: WashingMachine, key: 'washing', to: '/book?service=washing_machine' },
    { icon: Wrench, key: 'appliance', to: '/book?service=appliance' },
  ]

  return (
    <div>
      <section className="relative bg-gradient-to-br from-primary-600 via-primary-500 to-primary-700 text-white py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-64 h-64 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-accent-gold rounded-full blur-3xl" />
        </div>
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <h1 className="text-4xl md:text-6xl font-bold text-center mb-4">
            {t('hero.title')}
          </h1>
          <p className="text-xl md:text-2xl text-primary-100 text-center max-w-2xl mx-auto mb-2">
            {t('hero.subtitle')}
          </p>
          <p className="text-primary-200 text-center mb-10">
            {t('hero.location')}
          </p>
          <div className="flex justify-center">
            <Link
              to="/book"
              className="inline-flex items-center gap-2 bg-accent-gold text-gray-900 px-8 py-4 rounded-full font-bold text-lg hover:bg-accent-gold/90 transition shadow-lg"
            >
              {t('hero.cta')}
              <ChevronLeft className="w-5 h-5 rotate-180" />
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 bg-accent-sand/30">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">
            {t('services.title')}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map(({ icon: Icon, key, to }) => (
              <Link
                key={key}
                to={to}
                className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition flex flex-col items-center text-center group"
              >
                <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center mb-4 group-hover:bg-primary-200 transition">
                  <Icon className="w-8 h-8 text-primary-600" />
                </div>
                <h3 className="font-semibold text-gray-800">
                  {t(`services.${key}`)}
                </h3>
              </Link>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link to="/services" className="text-primary-600 font-medium hover:underline">
              {t('home.viewAllServices')} →
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-4">{t('home.whyUs')}</h2>
          <p className="text-gray-600 mb-6">
            {t('home.whyUsText')}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="https://wa.me/966582618038"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-full hover:bg-green-700 transition"
            >
              <span>WhatsApp</span>
              {t('contact.whatsapp')}
            </a>
            <a
              href="tel:0582618038"
              className="inline-flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-full hover:bg-primary-700 transition"
            >
              {t('contact.call')} 0582618038
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
