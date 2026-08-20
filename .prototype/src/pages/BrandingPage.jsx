import { useState } from 'react'
import { useLanguage } from '../i18n/LanguageContext'
import { usePrototypeStore } from '../store/prototypeStore'
import AppIcon from '../components/common/AppIcon'
import ShinyText from '../components/reactbits/ShinyText'
import SpotlightCard from '../components/reactbits/SpotlightCard'

export default function BrandingPage() {
  const { t, language } = useLanguage()
  const branding = usePrototypeStore((s) => s.branding)
  const setBranding = usePrototypeStore((s) => s.setBranding)

  const [form, setForm] = useState({
    brand_name: branding?.brand_name || 'FIFA Champions Arena Cairo',
    primary_color: branding?.primary_color || '#38bdf8',
    secondary_color: branding?.secondary_color || '#f59e0b',
  })
  const [notice, setNotice] = useState('')

  function handleColorChange(key, value) {
    const updated = { ...form, [key]: value }
    setForm(updated)
    setBranding({ [key]: value })
  }

  function handleSave(e) {
    e.preventDefault()
    setBranding(form)
    setNotice(language === 'ar' ? 'تم تطبيق وحفظ الهوية والألوان بنجاح!' : 'Branding colors applied across system!')
    setTimeout(() => setNotice(''), 3500)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-6">
      <SpotlightCard className="border border-white/10 bg-slate-950/80 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-fuchsia-400/40 bg-fuchsia-500/20 text-fuchsia-400">
            <AppIcon name="palette" size={22} />
          </div>
          <div>
            <ShinyText text={t('navBranding')} className="text-xl font-black text-white" />
            <p className="text-xs text-slate-400">
              {language === 'ar' ? 'تخصيص ألوان الصالة، الشعار، والمظهر البصري لجميع الشاشات' : 'Arena brand colors, theme palette, and broadcast styling'}
            </p>
          </div>
        </div>
      </SpotlightCard>

      {notice && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/15 p-3.5 text-xs font-bold text-emerald-200">
          <AppIcon name="check" size={16} className="text-emerald-400" />
          <span>{notice}</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Color Palette Form */}
        <SpotlightCard className="border border-white/10 p-6 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-sky-400 flex items-center gap-2">
            <AppIcon name="palette" size={16} />
            <span>{language === 'ar' ? 'ألوان وسمات الصالة' : 'Arena Colors & Theme'}</span>
          </h3>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-300">
                {language === 'ar' ? 'اسم الصالة أو العلامة' : 'Arena Brand Name'}
              </label>
              <input
                className="w-full rounded-xl border border-white/15 bg-slate-900 px-3.5 py-2.5 text-xs text-white focus:border-sky-400 focus:outline-none"
                value={form.brand_name}
                onChange={(e) => setForm((s) => ({ ...s, brand_name: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-300">
                  {language === 'ar' ? 'اللون الأساسي (Primary)' : 'Primary Accent'}
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-slate-900 px-2 py-1.5">
                  <input
                    type="color"
                    className="h-8 w-8 cursor-pointer rounded-lg border-0 bg-transparent"
                    value={form.primary_color}
                    onChange={(e) => handleColorChange('primary_color', e.target.value)}
                  />
                  <input
                    type="text"
                    className="w-full bg-transparent text-xs font-mono text-white focus:outline-none"
                    value={form.primary_color}
                    onChange={(e) => handleColorChange('primary_color', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-300">
                  {language === 'ar' ? 'اللون الثانوي (Glow/Gold)' : 'Secondary Accent'}
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-slate-900 px-2 py-1.5">
                  <input
                    type="color"
                    className="h-8 w-8 cursor-pointer rounded-lg border-0 bg-transparent"
                    value={form.secondary_color}
                    onChange={(e) => handleColorChange('secondary_color', e.target.value)}
                  />
                  <input
                    type="text"
                    className="w-full bg-transparent text-xs font-mono text-white focus:outline-none"
                    value={form.secondary_color}
                    onChange={(e) => handleColorChange('secondary_color', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Live Theme Preview Box */}
            <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4 space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                {language === 'ar' ? 'معاينة حية للمظهر' : 'Live Theme Preview'}
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  style={{ backgroundColor: form.primary_color }}
                  className="rounded-lg px-4 py-1.5 text-xs font-black text-black shadow-lg"
                >
                  Primary Action
                </button>
                <button
                  type="button"
                  style={{ borderColor: form.secondary_color, color: form.secondary_color }}
                  className="rounded-lg border px-4 py-1.5 text-xs font-bold"
                >
                  Secondary Glow
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-xl border border-sky-400 bg-sky-500 px-6 py-2.5 text-xs font-bold text-slate-950 shadow-[0_0_15px_rgba(56,189,248,0.3)] hover:bg-sky-400"
            >
              <AppIcon name="save" size={14} />
              <span>{language === 'ar' ? 'حفظ وتطبيق المظهر' : 'Save & Apply Theme'}</span>
            </button>
          </form>
        </SpotlightCard>

        {/* Media & Cinema Assets */}
        <SpotlightCard className="border border-white/10 p-6 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-fuchsia-400 flex items-center gap-2">
            <AppIcon name="sparkles" size={16} />
            <span>{language === 'ar' ? 'وسائط العرض والشعارات' : 'Logos & Media Assets'}</span>
          </h3>

          <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4 space-y-2">
            <label className="text-xs font-bold text-slate-300 block">
              {language === 'ar' ? 'شعار الصالة الحالي (Logo Preview)' : 'Arena Logo'}
            </label>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl border border-sky-400/30 bg-black overflow-hidden flex items-center justify-center">
                <img src={branding?.logo_url} alt="Logo" className="h-full w-full object-cover" />
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                {language === 'ar'
                  ? 'يظهر الشعار في أعلى شاشات العرض المباشر ولوحة التحكم والتقارير المالية.'
                  : 'Logo appears across spectator displays, topbars, and official match fixtures.'}
              </p>
            </div>
          </div>
        </SpotlightCard>
      </div>
    </div>
  )
}
