import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Wind,
  Thermometer,
  WashingMachine,
  Wrench,
  ChevronLeft,
  MessageCircle,
  Phone,
  ShieldCheck,
  Zap,
  Clock,
  CheckCircle2,
  Users,
} from 'lucide-react'

import imgAc from './premium-ac.png'
import imgFridge from './premium-fridge.png'
import imgWashing from './premium-washing.png'
import imgAppliance from './premium-appliance.png'

export default function Home() {
  const { t } = useTranslation()

  const services = [
    { icon: Wind, key: 'ac', to: '/book?service=ac', image: imgAc },
    { icon: Thermometer, key: 'refrigerator', to: '/book?service=refrigerator', image: imgFridge },
    { icon: WashingMachine, key: 'washing', to: '/book?service=washing_machine', image: imgWashing },
    { icon: Wrench, key: 'appliance', to: '/book?service=appliance', image: imgAppliance },
  ] as const

  const features = [
    { icon: ShieldCheck, title: 'Certified Experts', desc: 'Our technicians are highly trained and certified for all major brands.' },
    { icon: Zap, title: 'Fast Response', desc: 'We value your time. Quick diagnostics and repairs on the same day.' },
    { icon: Clock, title: '24/7 Availability', desc: 'Emergency? We are available round the clock in Dammam.' },
    { icon: CheckCircle2, title: 'Guaranteed Work', desc: 'We provide a guarantee on all our repair and maintenance services.' },
  ]

  const heroStats = [
    { label: t('home.stats_experience'), value: '15+', icon: Clock },
    { label: t('home.stats_projects'), value: '2.5k+', icon: CheckCircle2 },
    { label: t('home.stats_satisfaction'), value: '100%', icon: Users },
  ]

  return (
    <div className="bg-white overflow-x-hidden">
      {/* HERO SECTION */}
      <section className="relative min-h-[90vh] flex items-center pt-20 pb-32 overflow-hidden">
        {/* Abstract Background Design */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-[800px] h-[800px] bg-primary-100/50 rounded-full blur-3xl opacity-30 pointer-events-none" />
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 w-[600px] h-[600px] bg-accent-gold/20 rounded-full blur-3xl opacity-20 pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Column: Context & CTA */}
            <div className="space-y-10 order-2 lg:order-1 relative z-10">
              <div className="inline-flex items-center gap-2 bg-primary-50 px-4 py-2 rounded-full border border-primary-100 animate-fade-in">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-primary-500"></span>
                </span>
                <span className="text-sm font-bold text-primary-700 tracking-wide uppercase">
                  {t('hero.location')}
                </span>
              </div>

              <div className="space-y-6">
                <h1 className="text-5xl md:text-7xl font-black text-gray-900 leading-[1.1] tracking-tight">
                  <span className="block text-primary-600">{t('hero.title')}</span>
                  <span className="block mt-2 italic font-medium text-4xl md:text-5xl text-gray-400">Superior Repair Solutions</span>
                </h1>
                <p className="text-xl text-gray-600 max-w-xl leading-relaxed">
                  {t('hero.subtitle')}. Professional, reliable, and guaranteed services for Your Home comfort.
                </p>
              </div>

              <div className="flex flex-wrap gap-5">
                <Link
                  to="/book"
                  className="group relative inline-flex items-center gap-3 bg-gray-900 text-white px-10 py-5 rounded-2xl font-black text-lg shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 bg-gradient-to-r from-gray-900 to-gray-800"
                >
                  <span className="relative z-10">{t('hero.cta')}</span>
                  <div className="bg-white/10 p-1.5 rounded-lg group-hover:bg-white/20 transition-colors">
                    <ChevronLeft className="w-5 h-5 flip-rtl" />
                  </div>
                </Link>

                <a
                  href={`https://wa.me/966582618038`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 bg-white border-2 border-primary-100 px-8 py-5 rounded-2xl text-gray-700 font-bold hover:bg-primary-50 hover:border-primary-200 transition-all duration-300"
                >
                  <MessageCircle className="w-6 h-6 text-green-500" />
                  <span>WhatsApp</span>
                </a>
              </div>

              <div className="grid grid-cols-3 gap-8 pt-6 border-t border-gray-100">
                {heroStats.map((stat) => (
                  <div key={stat.label} className="group cursor-default">
                    <div className="text-3xl font-black text-primary-600 group-hover:scale-110 transition-transform origin-left">
                      {stat.value}
                    </div>
                    <div className="text-sm font-medium text-gray-500 mt-1 uppercase tracking-wider">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Visual Showcase */}
            <div className="relative order-1 lg:order-2">
              <div className="relative z-10 rounded-[40px] overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] aspect-square lg:aspect-auto lg:h-[600px]">
                <img
                  src={imgAc}
                  alt="Premium AC Repair"
                  className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

                {/* Floating Service Badge */}
                <div className="absolute bottom-8 left-8 right-8 bg-white/10 backdrop-blur-xl border border-white/20 p-6 rounded-3xl flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-white/70 text-sm font-medium">Expert Maintenance</p>
                    <p className="text-white text-xl font-black">Professional Service</p>
                  </div>
                  <div className="bg-accent-gold p-3 rounded-2xl shadow-lg">
                    <Wind className="w-8 h-8 text-gray-900" />
                  </div>
                </div>
              </div>

              {/* Decorative elements */}
              <div className="absolute -top-6 -right-6 w-32 h-32 bg-accent-gold rounded-full -z-10" />
              <div className="absolute -bottom-6 -left-6 w-48 h-48 border-4 border-primary-200 rounded-full -z-10" />
            </div>
          </div>
        </div>
      </section>

      {/* SERVICE GRID SECTION */}
      <section className="py-24 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div className="max-w-2xl space-y-4 text-center md:text-left">
              <h2 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight">
                {t('services.title')}
              </h2>
              <p className="text-xl text-gray-500 leading-relaxed font-medium">
                Comprehensive repair and maintenance services for your essential home appliances.
              </p>
            </div>
            <Link
              to="/services"
              className="inline-flex items-center gap-2 text-primary-600 font-black text-lg hover:underline decoration-4 underline-offset-8"
            >
              {t('home.viewAllServices')}
              <ChevronLeft className="w-5 h-5 flip-rtl" />
            </Link>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {services.map(({ icon: Icon, key, to, image }) => (
              <Link
                key={key}
                to={to}
                className="group relative bg-white rounded-[2rem] p-4 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.1)] hover:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.2)] transition-all duration-500 overflow-hidden flex flex-col"
              >
                <div className="relative h-64 rounded-3xl overflow-hidden mb-6">
                  <img
                    src={image}
                    alt={t(`services.${key}`)}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl inline-flex items-center gap-2 shadow-sm font-bold text-gray-800 text-sm">
                      <Icon className="w-4 h-4 text-primary-600" />
                      {t(`services.${key}`)}
                    </div>
                  </div>
                </div>
                <div className="px-2 pb-4 space-y-4">
                  <p className="text-gray-500 text-sm font-medium leading-relaxed">
                    {t('home.hero_service_snippet')}
                  </p>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-primary-600 font-black text-sm uppercase tracking-wider group-hover:translate-x-1 transition-transform">
                      {t('booking.title')}
                    </span>
                    <div className="p-2 bg-primary-50 text-primary-600 rounded-lg group-hover:bg-primary-600 group-hover:text-white transition-colors">
                      <ChevronLeft className="w-4 h-4 flip-rtl" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* WHY CHOOSE US - FEATURES */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4">
          <div className="bg-gray-900 rounded-[3rem] p-8 md:p-16 lg:p-24 relative overflow-hidden text-center md:text-left">
            {/* Background pattern */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary-600/10 rounded-full blur-[100px]" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent-gold/5 rounded-full blur-[100px]" />

            <div className="grid lg:grid-cols-2 gap-16 relative z-10 items-center">
              <div className="space-y-8">
                <div className="inline-block px-4 py-1.5 bg-primary-900/50 border border-primary-800 rounded-full text-primary-400 text-xs font-bold uppercase tracking-[0.2em]">
                  Professional Grade
                </div>
                <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
                  {t('home.whyUs')}
                </h2>
                <p className="text-xl text-gray-400 leading-relaxed max-w-lg">
                  {t('home.whyUsText')}. We combine years of experience with modern technology to deliver the best results.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <a
                    href="tel:0582618038"
                    className="inline-flex items-center justify-center gap-3 bg-primary-600 text-white px-8 py-5 rounded-2xl font-black text-lg hover:bg-primary-500 transition-all duration-300"
                  >
                    <Phone className="w-6 h-6" />
                    {t('contact.call')}
                  </a>
                  <Link
                    to="/contact"
                    className="inline-flex items-center justify-center gap-3 bg-white/10 text-white border border-white/20 px-8 py-5 rounded-2xl font-black text-lg hover:bg-white/20 transition-all duration-300"
                  >
                    Contact Support
                  </Link>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                {features.map((feature, idx) => (
                  <div key={idx} className="bg-white/5 border border-white/10 p-8 rounded-3xl hover:bg-white/10 transition-colors group">
                    <div className="w-14 h-14 bg-gradient-to-br from-primary-600 to-primary-800 rounded-2xl flex items-center justify-center mb-6 group-hover:rotate-6 transition-transform">
                      <feature.icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">{feature.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* EMERGENCY CTA / SECONDARY HERO */}
      <section className="py-24 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4">
          <div className="relative rounded-[3rem] bg-accent-sand/20 p-8 md:p-16 flex flex-col items-center text-center space-y-10 border border-accent-sand/30">
            <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 flex flex-col gap-4 pointer-events-none">
              <Zap className="w-24 h-24 text-primary-600" />
              <Wind className="w-24 h-24 text-accent-gold translate-x-12" />
            </div>

            <div className="space-y-4 relative z-10">
              <h2 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight">
                Need Fast Emergency Service?
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto font-medium leading-relaxed">
                Contact us now for 24/7 emergency AC and appliance repairs anywhere in Dammam. We are just a call away!
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-6 relative z-10 w-full justify-center">
              <a
                href="tel:0582618038"
                className="inline-flex items-center justify-center gap-3 bg-gray-900 text-white px-10 py-5 rounded-2xl font-black text-lg shadow-xl shadow-gray-900/20 hover:scale-105 active:scale-95 transition-all"
              >
                <Phone className="w-6 h-6 border-r border-white/20 pr-1 mr-1" />
                <span>Call 0582618038</span>
              </a>
              <Link
                to="/book"
                className="inline-flex items-center justify-center gap-3 bg-primary-600 text-white px-10 py-5 rounded-2xl font-black text-lg shadow-xl shadow-primary-600/20 hover:scale-105 active:scale-95 transition-all"
              >
                {t('booking.title')}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
