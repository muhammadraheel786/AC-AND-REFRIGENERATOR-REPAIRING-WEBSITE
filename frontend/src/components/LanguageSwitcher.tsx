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
    <div className="flex gap-1">
      {languages.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => handleChange(code)}
          className={`px-2 py-1 rounded text-sm transition ${
            i18n.language === code
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
