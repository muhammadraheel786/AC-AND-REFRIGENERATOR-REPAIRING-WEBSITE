import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Wind,
  Thermometer,
  WashingMachine,
  Wrench,
  ChevronLeft,
  PlayCircle,
} from 'lucide-react'
import heroAcMain from './ac repair 2.jpg'
import heroAcSecondary from './ac repair 3.jpg'
import imgAc from './ac repair.jpg'
import imgFridge from './refrigenerator repair.jpg'
import imgWashing from './washing machine repari.jpg'
import imgAppliance from './home appliance repaing.jpg'

export default function Home() {
  const { t } = useTranslation()

  const services = [
    { icon: Wind, key: 'ac', to: '/book?service=ac', image: imgAc },
    { icon: Thermometer, key: 'refrigerator', to: '/book?service=refrigerator', image: imgFridge },
    { icon: WashingMachine, key: 'washing', to: '/book?service=washing_machine', image: imgWashing },
    { icon: Wrench, key: 'appliance', to: '/book?service=appliance', image: imgAppliance },
  ] as const

  const heroStats = [
    { label: t('home.stats_experience'), value: '10+' },
    { label: t('home.stats_projects'), value: '132+' },
    { label: t('home.stats_satisfaction'), value: '100%' },
  ]

  return (
    <div className="bg-gray-50">
      {/* HERO WITH BACKGROUND VIDEO */}
      <section className="relative text-white overflow-hidden">
        {/* Background video / animated hero */}
        <video
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          muted
          loop
          playsInline
        >
          <source
            src="https://videos.pexels.com/video-files/7539920/7539920-hd_1920_1080_25fps.mp4"
            type="video/mp4"
          />
        </video>
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/60 to-primary-900/80" />

        <div className="relative max-w-7xl mx-auto px-4 py-20 md:py-28">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            {/* Left: text + CTA */}
            <div className="space-y-6 md:space-y-8 animate-[fadeInUp_0.7s_ease-out]">
              <p className="uppercase tracking-[0.2em] text-accent-gold text-sm md:text-xs">
                {t('hero.location')}
              </p>
              <h1 className="text-4xl md:text-6xl font-extrabold leading-tight">
                {t('hero.title')}
              </h1>
              <p className="text-lg md:text-xl text-primary-100 max-w-xl">
                {t('hero.subtitle')}
              </p>

              <div className="flex flex-wrap gap-4 items-center">
                <Link
                  to="/book"
                  className="inline-flex items-center gap-2 bg-accent-gold text-gray-900 px-8 py-3 rounded-full font-semibold text-base md:text-lg hover:bg-accent-gold/90 transition-transform duration-300 hover:-translate-y-0.5 shadow-lg"
                >
                  {t('hero.cta')}
                  <ChevronLeft className="w-5 h-5 rotate-180" />
                </Link>

                <a
                  href="https://wa.me/966582618038"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 border border-white/30 px-6 py-2.5 rounded-full text-sm md:text-base hover:bg-white/10 transition-colors"
                >
                  <PlayCircle className="w-5 h-5 text-accent-gold" />
                  <span>{t('home.hero_whatsapp')}</span>
                </a>
              </div>

              <div className="flex flex-wrap gap-6 pt-4">
                {heroStats.map((stat) => (
                  <div key={stat.label} className="min-w-[90px]">
                    <div className="text-2xl md:text-3xl font-bold text-accent-gold">
                      {stat.value}
                    </div>
                    <div className="text-xs md:text-sm text-primary-100">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: service highlight cards + AC imagery */}
            <div className="grid grid-cols-2 gap-4 md:gap-6">
              {/* Top wide AC hero image */}
              <div className="col-span-2 relative h-32 md:h-40 rounded-3xl overflow-hidden shadow-2xl">
                <div
                  className="absolute inset-0 bg-cover bg-center transform hover:scale-105 transition-transform duration-700"
                  style={{ backgroundImage: `url(${heroAcMain})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/20 to-transparent" />
                <div className="relative z-10 h-full flex items-center px-5 md:px-7">
                  <div>
                    <p className="text-xs md:text-sm text-primary-100 mb-1">
                      {t('home.hero_available_24_7')}
                    </p>
                    <h3 className="font-semibold text-base md:text-lg">
                      {t('services.ac')}
                    </h3>
                  </div>
                </div>
              </div>

              {services.map(({ icon: Icon, key, image }) => (
                <div
                  key={key}
                  className="group relative overflow-hidden rounded-3xl bg-white/5 backdrop-blur-sm border border-white/10 p-4 flex flex-col justify-between shadow-xl hover:shadow-2xl transition-transform duration-300 hover:-translate-y-1"
                >
                  <div className="relative h-32 md:h-40 rounded-2xl overflow-hidden mb-4">
                    <div
                      className="absolute inset-0 bg-cover bg-center transform group-hover:scale-105 transition-transform duration-500"
                      style={{ backgroundImage: `url(${image})` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  </div>
                  <div className="relative z-10 space-y-3">
                    <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center">
                      <Icon className="w-6 h-6 text-accent-gold" />
                    </div>
                    <h3 className="font-semibold text-white text-sm md:text-base">
                      {t(`services.${key}`)}
                    </h3>
                    <p className="text-[11px] md:text-xs text-primary-100">
                      {t('home.hero_service_snippet')}
                    </p>
                  </div>
                  <div className="relative z-10 mt-4 text-xs text-accent-gold font-medium">
                    {t('home.hero_available_24_7')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* QUICK SERVICE CARDS */}
      <section className="py-16 bg-accent-sand/30">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">
            {t('services.title')}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map(({ icon: Icon, key, to, image }) => (
              <Link
                key={key}
                to={to}
                className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition transform hover:-translate-y-1 duration-300 overflow-hidden group flex flex-col text-center"
              >
                <div className="relative h-40 md:h-48 w-full overflow-hidden">
                  <div
                    className="absolute inset-0 bg-cover bg-center transform group-hover:scale-105 transition-transform duration-500"
                    style={{ backgroundImage: `url(${image})` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                </div>
                <div className="p-5 flex-1 flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center group-hover:bg-primary-200 transition-colors duration-300">
                    <Icon className="w-7 h-7 text-primary-600" />
                  </div>
                  <h3 className="font-semibold text-gray-800">
                    {t(`services.${key}`)}
                  </h3>
                </div>
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

      {/* WHY US / CTA */}
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
