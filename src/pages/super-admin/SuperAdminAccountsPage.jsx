import { useEffect, useState } from 'react'
import { fetchBusinesses } from '../../services/brandingService'
import { useLanguage } from '../../i18n/LanguageContext'
import AppIcon from '../../components/common/AppIcon'
import ShinyText from '../../components/reactbits/ShinyText'
import SpotlightCard from '../../components/reactbits/SpotlightCard'

export default function SuperAdminAccountsPage() {
  const { t, language } = useLanguage()
  const [stats, setStats] = useState({ total: 0, active: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBusinesses()
      .then((items) => {
        const active = items.filter((item) => new Date(item.subscription_expires_at || 0).getTime() > Date.now()).length
        setStats({ total: items.length, active })
        setLoading(false)
      })
      .catch(() => {
        setStats({ total: 0, active: 0 })
        setLoading(false)
      })
  }, [])

  return (
    <section className="space-y-6">
      <SpotlightCard className="border border-white/10 bg-slate-950/80 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-sky-400/40 bg-sky-500/20 text-sky-400">
            <AppIcon name="user" size={22} />
          </div>
          <div>
            <ShinyText text={t('navAccounts')} className="text-xl font-black text-white" />
            <p className="text-xs text-slate-400">
              {language === 'ar' ? 'نظرة عامة على حسابات المنصة وتراخيص الصالات' : 'Overview of system master accounts and active venues'}
            </p>
          </div>
        </div>
      </SpotlightCard>

      <div className="grid gap-4 sm:grid-cols-3">
        <SpotlightCard className="border border-sky-500/30 bg-slate-950/80 p-5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{language === 'ar' ? 'إجمالي الحسابات' : 'Total Master Accounts'}</span>
            <AppIcon name="users" size={18} className="text-sky-400" />
          </div>
          <p className="mt-2.5 text-3xl font-black text-white">{loading ? '--' : stats.total}</p>
        </SpotlightCard>

        <SpotlightCard className="border border-emerald-500/30 bg-slate-950/80 p-5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{language === 'ar' ? 'الحسابات النشطة' : 'Active Licensed Accounts'}</span>
            <AppIcon name="check" size={18} className="text-emerald-400" />
          </div>
          <p className="mt-2.5 text-3xl font-black text-emerald-400">{loading ? '--' : stats.active}</p>
        </SpotlightCard>

        <SpotlightCard className="border border-rose-500/30 bg-slate-950/80 p-5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{language === 'ar' ? 'الحسابات المنتهية' : 'Expired Accounts'}</span>
            <AppIcon name="alert" size={18} className="text-rose-400" />
          </div>
          <p className="mt-2.5 text-3xl font-black text-rose-400">
            {loading ? '--' : Math.max(0, stats.total - stats.active)}
          </p>
        </SpotlightCard>
      </div>
    </section>
  )
}
