import React from 'react'
import { useLanguage } from '../../i18n/LanguageContext'
import AppIcon from '../common/AppIcon'
import ShinyText from '../reactbits/ShinyText'

export default function AppTopbar({ title, subtitle, brandName, logoUrl, onToggleSidebar }) {
  const { language, toggleLanguage, t, isRtl } = useLanguage()

  return (
    <header className="sticky top-0 z-20 mb-4 rounded-2xl border border-white/10 bg-slate-950/80 p-3 shadow-[0_10px_35px_rgba(0,0,0,0.4)] backdrop-blur-xl md:px-5 md:py-3.5">
      <div className="flex items-center justify-between gap-3">
        {/* Mobile Sidebar Toggle Button */}
        <button
          type="button"
          onClick={onToggleSidebar}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-white transition hover:bg-white/10 md:hidden"
          aria-label="Toggle Menu"
        >
          <AppIcon name="sliders" size={18} />
        </button>

        {/* Page Title & Subtitle */}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-bold text-white md:text-xl tracking-tight">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-0.5 truncate text-xs text-slate-400 font-medium">
              {subtitle}
            </p>
          ) : null}
        </div>

        {/* Right Section: Language Switcher & Branding Pill */}
        <div className="flex items-center gap-2.5">
          {/* Language Toggle Button */}
          <button
            type="button"
            onClick={toggleLanguage}
            className="flex items-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs font-bold text-sky-300 transition-all hover:bg-sky-500/20 hover:border-sky-400 hover:shadow-[0_0_15px_rgba(56,189,248,0.2)] active:scale-95"
            title={language === 'ar' ? 'Switch to English' : 'التحويل إلى العربية'}
          >
            <AppIcon name="globe" size={14} className="text-sky-400" />
            <span>{language === 'ar' ? 'English' : 'عربي'}</span>
          </button>

          {/* Business / Venue Badge */}
          <div className="hidden sm:flex items-center gap-2.5 rounded-xl border border-white/10 bg-slate-900/80 px-3 py-1.5">
            <div className={isRtl ? 'text-right' : 'text-left'}>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                {language === 'ar' ? 'الصالة النشطة' : 'Active Venue'}
              </p>
              <p className="text-xs font-bold text-white truncate max-w-[120px]">
                {brandName || 'FIFA Arena'}
              </p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg border border-sky-500/30 bg-sky-950/50">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <AppIcon name="trophy" size={16} className="text-amber-400" />
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
