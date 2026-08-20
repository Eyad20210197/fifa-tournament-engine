import { createContext, useContext, useEffect, useState, useMemo } from 'react'
import { translations } from './translations'

const LanguageContext = createContext(null)

const STORAGE_KEY = 'fifa_tournament_lang'

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved === 'ar' || saved === 'en') return saved
    } catch {
      // ignore storage error
    }
    return 'ar' // Default to Egyptian Arabic
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, language)
    } catch {
      // ignore storage error
    }
    document.documentElement.lang = language
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
  }, [language])

  const t = useMemo(() => {
    return (key, params = {}) => {
      const langDict = translations[language] || translations.ar
      let text = langDict[key] || translations.en[key] || key

      // Handle parameter substitutions like {count}, {nearest}, {needed}, etc.
      if (params && typeof params === 'object') {
        Object.entries(params).forEach(([paramKey, paramValue]) => {
          text = text.replaceAll(`{${paramKey}}`, String(paramValue))
        })
      }
      return text
    }
  }, [language])

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === 'ar' ? 'en' : 'ar'))
  }

  const isRtl = language === 'ar'

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t, isRtl }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
