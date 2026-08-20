import { createContext, useContext, useEffect, useState } from 'react'

const translations = {
  ar: {
    appName: 'فيفا برو | نظام إدارة بطولات البلايستيشن',
    prototypeBadge: 'نسخة العرض التفاعلية (Showcase Prototype)',
    navHub: 'منصة العرض',
    navDisplay: 'شاشة العرض المباشر',
    navControl: 'تحكيم المباراة',
    navSchedule: 'إدارة البطولة والجدول',
    navStations: 'أجهزة البلايستيشن',
    navBranding: 'الهوية البصرية',
    navSuperAdmin: 'لوحة المشرف العام',
    navFinance: 'المالية والأرباح',
    activeTournament: 'البطولة النشطة',
    liveMatch: 'مباراة مباشرة',
    standings: 'جدول الترتيب',
    bracket: 'شجرة الأدوار',
    schedule: 'جدول المباريات',
    opening: 'شاشة الافتتاح',
    totalTeams: 'إجمالي الفرق',
    totalMatches: 'إجمالي المباريات',
    activeStations: 'الأجهزة المشغولة',
    netRevenue: 'صافي الدخل',
    launchLive: 'بدء البث المباشر',
    startMatch: 'بدء المباراة',
    endMatch: 'إنهاء المباراة',
    homeGoal: '+ هدف للأول',
    awayGoal: '+ هدف للثاني',
    undo: 'تراجع عن الهدف',
    resetTimer: 'إعادة ضبط الساعة',
    confirmResult: 'تأكيد النتيجة',
    restartMatch: 'إعادة المباراة',
    save: 'حفظ التعديلات',
    create: 'إنشاء',
    delete: 'حذف',
    edit: 'تعديل',
    loading: 'جار المعالجة...',
    status: 'الحالة',
    tournamentName: 'اسم البطولة',
    tournamentFormat: 'نوع البطولة',
    league: 'دوري نقاط (League)',
    knockout: 'خروج مغلوب (Knockout)',
    hybrid: 'مجموعات + إقصائيات (Hybrid)',
    singleLeg: 'مباراة واحدة',
    homeAway: 'ذهاب وإياب',
    psCount: 'أجهزة البلايستيشن',
    hourlyRate: 'سعر الساعة',
    totalRevenue: 'إجمالي الإيرادات',
    totalExpenses: 'إجمالي المصروفات',
    profitMargin: 'نسبة الأرباح',
    syncNotice: 'المزامنة الفورية عبر النوافذ والشاشات مفعلة (0ms Cross-Tab Sync)',
  },
  en: {
    appName: 'FIFA Pro | Global Tournament System',
    prototypeBadge: 'Interactive Showcase Prototype',
    navHub: 'Showcase Hub',
    navDisplay: 'Spectator Display',
    navControl: 'Referee Control',
    navSchedule: 'Tournament Suite',
    navStations: 'PS5 Stations',
    navBranding: 'Brand Studio',
    navSuperAdmin: 'Super Admin',
    navFinance: 'Financial Ledger',
    activeTournament: 'Active Tournament',
    liveMatch: 'Live Match',
    standings: 'Standings',
    bracket: 'Playoff Bracket',
    schedule: 'Fixtures',
    opening: 'Cinema Opening',
    totalTeams: 'Total Teams',
    totalMatches: 'Total Matches',
    activeStations: 'Active Stations',
    netRevenue: 'Net Revenue',
    launchLive: 'Launch Live Stream',
    startMatch: 'Start Match',
    endMatch: 'End Match',
    homeGoal: '+ Home Goal',
    awayGoal: '+ Away Goal',
    undo: 'Undo Goal',
    resetTimer: 'Reset Clock',
    confirmResult: 'Confirm Result',
    restartMatch: 'Restart Fixture',
    save: 'Save Changes',
    create: 'Create',
    delete: 'Delete',
    edit: 'Edit',
    loading: 'Processing...',
    status: 'Status',
    tournamentName: 'Tournament Name',
    tournamentFormat: 'Tournament Format',
    league: 'Round Robin (League)',
    knockout: 'Single Elimination (Knockout)',
    hybrid: 'Groups + Knockouts (Hybrid)',
    singleLeg: 'Single Match',
    homeAway: 'Home & Away (2 Legs)',
    psCount: 'PS5 Consoles',
    hourlyRate: 'Hourly Rate',
    totalRevenue: 'Total Revenue',
    totalExpenses: 'Total Expenses',
    profitMargin: 'Profit Margin',
    syncNotice: 'Instant 0ms Cross-Tab Broadcast Channel Sync Active',
  },
}

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('fifa_prototype_lang') || 'ar'
  })

  useEffect(() => {
    localStorage.setItem('fifa_prototype_lang', language)
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = language
  }, [language])

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === 'ar' ? 'en' : 'ar'))
  }

  const t = (key) => {
    return translations[language]?.[key] || translations.en?.[key] || key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t, isRtl: language === 'ar' }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) throw new Error('useLanguage must be used within a LanguageProvider')
  return context
}
