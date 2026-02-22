import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Wind, Thermometer, WashingMachine, Wrench, Flame, Snowflake } from 'lucide-react'

export default function Services() {
  const { t } = useTranslation()

  const services = [
    { icon: Wind, key: 'ac', category: 'ac' },
    { icon: Thermometer, key: 'refrigerator', category: 'refrigerator' },
    { icon: WashingMachine, key: 'washing', category: 'washing_machine' },
    { icon: Wrench, key: 'appliance', category: 'appliance' },
    { icon: Flame, key: 'oven', category: 'oven' },
    { icon: Snowflake, key: 'cold_storage', category: 'cold_storage' },
  ]

  return (
    <div className="py-12 max-w-5xl mx-auto px-4">
      <h1 className="text-3xl font-bold text-center mb-12">{t('services.title')}</h1>
      <div className="grid md:grid-cols-2 gap-8">
        {services.map(({ icon: Icon, key, category }) => (
          <Link
            key={key}
            to={`/book?service=${category}`}
            className="flex items-start gap-4 p-6 rounded-2xl bg-white shadow hover:shadow-lg transition border border-gray-100"
          >
            <div className="w-14 h-14 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
              <Icon className="w-7 h-7 text-primary-600" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-gray-800">{t(`services.${key}`)}</h2>
              <p className="text-gray-600 mt-1">{t('services.bookNow')}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
