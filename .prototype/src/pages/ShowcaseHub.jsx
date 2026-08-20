import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useLanguage } from '../i18n/LanguageContext'
import { usePrototypeStore } from '../store/prototypeStore'
import AppIcon from '../components/common/AppIcon'
import ShinyText from '../components/reactbits/ShinyText'
import SpotlightCard from '../components/reactbits/SpotlightCard'

export default function ShowcaseHub() {
  const { t, language } = useLanguage()
  const tournaments = usePrototypeStore((s) => s.tournaments)
  const matches = usePrototypeStore((s) => s.matches)
  const teams = usePrototypeStore((s) => s.teams)
  const stations = usePrototypeStore((s) => s.stations)
  const liveMatchId = usePrototypeStore((s) => s.liveMatchId)
  const setLiveMatchId = usePrototypeStore((s) => s.setLiveMatchId)
  const setActiveScreen = usePrototypeStore((s) => s.setActiveScreen)

  const activeMatch = matches.find((m) => m.id === liveMatchId) || matches[0]
  const busyStationsCount = stations.filter((s) => s.status === 'busy').length

  const showcaseModules = [
    {
      title: language === 'ar' ? 'شاشة العرض للجمهور (Cinema Display)' : 'Spectator Live Cinema Display',
      desc: language === 'ar' ? 'بث سينمائي للشاشات الكبيرة: عرض المباريات المباشرة، جدول الترتيب، الشجرة الإقصائية، وفيديو الافتتاح.' : 'Full 16:9 cinema layout for venue TVs: live scores, league table, bracket tree, and intro video.',
      path: '/display',
      icon: 'tv',
      color: 'border-sky-500/40 text-sky-400',
      badge: '0ms Realtime Sync',
    },
    {
      title: language === 'ar' ? 'لوحة تحكيم المباريات (Referee Control)' : 'Live Referee Match Control',
      desc: language === 'ar' ? 'أزرار تحكيم عالية التباين، تسجيل الأهداف، التراجع، إيقاف/تشغيل عداد المباراة، وتأكيد النتائج.' : 'High-contrast cyan/gold goal counters, undo, stopwatch timer controls, and result confirmation.',
      path: '/control',
      icon: 'gamepad',
      color: 'border-emerald-500/40 text-emerald-400',
      badge: 'Interactive Scorekeeper',
    },
    {
      title: language === 'ar' ? 'إدارة البطولات والجداول (Tournament Suite)' : 'Tournament & Schedule Suite',
      desc: language === 'ar' ? 'إنشاء بطولات الدوري والإقصائيات، استيراد الفرق من Excel، الجدولة التلقائية الذكية، وتقدم الأدوار.' : 'Create League/Knockout/Hybrid formats, Excel import/export, smart auto-scheduler, and stage progression.',
      path: '/schedule',
      icon: 'calendar',
      color: 'border-amber-500/40 text-amber-400',
      badge: 'Engine & Rules',
    },
    {
      title: language === 'ar' ? 'أجهزة البلايستيشن وحساب الوقت (PS5 Stations)' : 'PS5 Station Runtime & Timers',
      desc: language === 'ar' ? 'متابعة عدادات تشغيل الأجهزة لحظياً، حساب أجور الساعات، وتوزيع المباريات على الشاشات.' : 'Live console timer tracking, per-hour billing, active session logs, and match allocation.',
      path: '/stations',
      icon: 'timer',
      color: 'border-indigo-500/40 text-indigo-400',
      badge: 'Hardware Timers',
    },
    {
      title: language === 'ar' ? 'استوديو الهوية البصرية (Brand Studio)' : 'Arena Branding & Customizer',
      desc: language === 'ar' ? 'تعديل الألوان الأساسية والتوهج مباشرة وتطبيقها على جميع الشاشات في الوقت الفعلي مع رفع الشعار.' : 'Dynamic real-time theme customizer, primary and secondary accents, and venue logo styling.',
      path: '/branding',
      icon: 'palette',
      color: 'border-fuchsia-500/40 text-fuchsia-400',
      badge: 'Dynamic Styling',
    },
    {
      title: language === 'ar' ? 'الحسابات المالية والجوائز (Financial Ledger)' : 'Tournament Finance & Profits',
      desc: language === 'ar' ? 'حساب رسوم التسجيل، الرعايات، تكاليف تشغيل الصالة، وسجل المصروفات وصافي الأرباح.' : 'Entry fee calculations, sponsorship funds, hall hourly operating costs, and profit breakdown.',
      path: '/finance',
      icon: 'dollar',
      color: 'border-teal-500/40 text-teal-400',
      badge: 'Financials',
    },
  ]

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-8">
      {/* Hero Banner */}
      <SpotlightCard className="border border-sky-500/30 bg-gradient-to-r from-slate-950 via-slate-900/90 to-slate-950 p-8">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-500/10 px-3.5 py-1 text-xs font-bold text-sky-300">
              <AppIcon name="sparkles" size={14} className="text-sky-400 animate-spin" />
              <span>{t('prototypeBadge')}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              <ShinyText text={language === 'ar' ? 'نظام إدارة بطولات الفيفا العالمي' : 'Global FIFA Esports Tournament System'} />
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              {language === 'ar'
                ? 'نموذج تفاعلي متكامل يعمل بالكامل داخل المتصفح مع مزامنة لحظية 0ms بين الشاشات، وإدارة متكاملة للأجهزة، والتحكيم المباشر، والنتائج.'
                : 'Fully interactive, zero-backend showcase prototype with 0ms cross-tab state syncing, spectator cinema broadcasting, referee scorekeeper, and PS5 console timers.'}
            </p>
          </div>

          {/* Quick Dual Launch Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              to="/display"
              className="flex items-center justify-center gap-2 rounded-xl border border-sky-400 bg-sky-500 px-6 py-3.5 text-xs font-black text-slate-950 shadow-[0_0_25px_rgba(56,189,248,0.4)] transition hover:bg-sky-400 active:scale-95"
            >
              <AppIcon name="tv" size={16} />
              <span>{language === 'ar' ? 'فتح شاشة العرض (Spectator TV)' : 'Launch Spectator Display'}</span>
            </Link>

            <Link
              to="/control"
              className="flex items-center justify-center gap-2 rounded-xl border border-emerald-400 bg-emerald-500 px-6 py-3.5 text-xs font-black text-slate-950 shadow-[0_0_25px_rgba(16,185,129,0.4)] transition hover:bg-emerald-400 active:scale-95"
            >
              <AppIcon name="gamepad" size={16} />
              <span>{language === 'ar' ? 'فتح لوحة التحكيم (Referee Control)' : 'Launch Match Control'}</span>
            </Link>
          </div>
        </div>
      </SpotlightCard>

      {/* Live System KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SpotlightCard className="border border-sky-500/25 p-5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{t('totalTeams')}</span>
            <AppIcon name="users" size={18} className="text-sky-400" />
          </div>
          <p className="mt-2 text-2xl font-black text-white font-mono">{teams.length} {language === 'ar' ? 'فرق' : 'Clubs'}</p>
        </SpotlightCard>

        <SpotlightCard className="border border-amber-500/25 p-5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{t('totalMatches')}</span>
            <AppIcon name="calendar" size={18} className="text-amber-400" />
          </div>
          <p className="mt-2 text-2xl font-black text-white font-mono">{matches.length} {language === 'ar' ? 'مباريات' : 'Matches'}</p>
        </SpotlightCard>

        <SpotlightCard className="border border-emerald-500/25 p-5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{t('activeStations')}</span>
            <AppIcon name="timer" size={18} className="text-emerald-400" />
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-400 font-mono">{busyStationsCount} / {stations.length} PS5</p>
        </SpotlightCard>

        <SpotlightCard className="border border-teal-500/25 p-5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{t('netRevenue')}</span>
            <AppIcon name="dollar" size={18} className="text-teal-400" />
          </div>
          <p className="mt-2 text-2xl font-black text-teal-400 font-mono">4,950 EGP</p>
        </SpotlightCard>
      </div>

      {/* Showcase Interactive Feature Grid */}
      <div className="space-y-4">
        <h2 className="text-xl font-black text-white flex items-center gap-2">
          <AppIcon name="sparkles" size={20} className="text-sky-400" />
          <span>{language === 'ar' ? 'أقسام ووحدات النظام التفاعلية' : 'Interactive System Modules'}</span>
        </h2>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {showcaseModules.map((mod, idx) => (
            <motion.div
              key={idx}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
            >
              <SpotlightCard className="border border-white/10 h-full p-6 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl border bg-white/5 ${mod.color}`}>
                      <AppIcon name={mod.icon} size={20} />
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-bold text-slate-300">
                      {mod.badge}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white">{mod.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{mod.desc}</p>
                </div>

                <Link
                  to={mod.path}
                  className="inline-flex items-center gap-2 text-xs font-bold text-sky-400 hover:text-sky-300 transition group"
                >
                  <span>{language === 'ar' ? 'استعراض القسم' : 'Explore View'}</span>
                  <AppIcon name="arrow" size={14} className="transition group-hover:translate-x-1" />
                </Link>
              </SpotlightCard>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
