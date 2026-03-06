import { useTranslation } from 'react-i18next'

export default function LanguageSwitcher() {
  const { i18n } = useTranslation()

  const languages = [
    { code: 'ar', label: 'العربية' },
    { code: 'en', label: 'English' },
    { code: 'ur', label: 'اردو' },
  ]

  const handleChange = (code: string) => {
    i18n.changeLanguage(code)
    document.documentElement.lang = code === 'ur' ? 'ur' : code
    document.documentElement.dir = code === 'en' ? 'ltr' : 'rtl'
  }

  return (
    <div className="flex bg-gray-100 p-1 rounded-xl shadow-inner-sm">
      {languages.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => handleChange(code)}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 ${i18n.language === code
              ? 'bg-white text-primary-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
            }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
