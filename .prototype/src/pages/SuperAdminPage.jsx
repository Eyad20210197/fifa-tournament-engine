import { useState } from 'react'
import { useLanguage } from '../i18n/LanguageContext'
import { usePrototypeStore } from '../store/prototypeStore'
import AppIcon from '../components/common/AppIcon'
import ShinyText from '../components/reactbits/ShinyText'
import SpotlightCard from '../components/reactbits/SpotlightCard'

export default function SuperAdminPage() {
  const { t, language } = useLanguage()
  const businesses = usePrototypeStore((s) => s.businesses)

  const activeCount = businesses.filter((b) => b.isActive).length
  const totalConsoles = businesses.reduce((acc, b) => acc + (b.ps_device_count || 0), 0)

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-6">
      <SpotlightCard className="border border-white/10 bg-slate-950/80 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-sky-400/40 bg-sky-500/20 text-sky-400">
            <AppIcon name="building" size={22} />
          </div>
          <div>
            <ShinyText text={t('navSuperAdmin')} className="text-xl font-black text-white" />
            <p className="text-xs text-slate-400">
              {language === 'ar' ? 'إدارة تراخيص الصالات، توزيع أجهزة البلايستيشن، وتجديد الاشتراكات' : 'Platform multi-tenant venues, console allocations, and subscription licensing'}
            </p>
          </div>
        </div>
      </SpotlightCard>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <SpotlightCard className="border border-sky-500/30 p-5">
          <span className="text-xs text-slate-400">{language === 'ar' ? 'إجمالي الصالات المسجلة' : 'Total Licensed Venues'}</span>
          <p className="mt-2 text-2xl font-black text-white font-mono">{businesses.length} {language === 'ar' ? 'صالات' : 'Venues'}</p>
        </SpotlightCard>

        <SpotlightCard className="border border-emerald-500/30 p-5">
          <span className="text-xs text-slate-400">{language === 'ar' ? 'الاشتراكات النشطة' : 'Active Subscriptions'}</span>
          <p className="mt-2 text-2xl font-black text-emerald-400 font-mono">{activeCount} / {businesses.length}</p>
        </SpotlightCard>

        <SpotlightCard className="border border-indigo-500/30 p-5">
          <span className="text-xs text-slate-400">{language === 'ar' ? 'إجمالي أجهزة PS5 المدارة' : 'Total PS5 Consoles'}</span>
          <p className="mt-2 text-2xl font-black text-indigo-400 font-mono">{totalConsoles} Consoles</p>
        </SpotlightCard>
      </div>

      {/* Venues Table */}
      <SpotlightCard className="border border-white/10 p-0 overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {language === 'ar' ? 'قائمة الصالات والتراخيص' : 'Licensed Venues & Subscriptions'}
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-xs text-left">
            <thead className="border-b border-white/10 bg-slate-900/80 text-slate-400 uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">{language === 'ar' ? 'الصالـة' : 'Venue Name'}</th>
                <th className="px-4 py-3">{language === 'ar' ? 'العلامة' : 'Brand'}</th>
                <th className="px-4 py-3">{language === 'ar' ? 'أجهزة PS5' : 'Consoles'}</th>
                <th className="px-4 py-3">{language === 'ar' ? 'تاريخ الانتهاء' : 'Expiry'}</th>
                <th className="px-4 py-3">{language === 'ar' ? 'الحالة' : 'Status'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {businesses.map((b) => (
                <tr key={b.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-bold text-white flex items-center gap-2">
                    <AppIcon name="building" size={14} className="text-sky-400" />
                    <span>{b.name}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{b.brand_name}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 font-bold font-mono">
                      {b.ps_device_count} PS5
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 font-mono">{b.subscription_expires_at}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                        b.isActive
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {b.isActive ? 'ACTIVE' : 'EXPIRED'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SpotlightCard>
    </div>
  )
}
