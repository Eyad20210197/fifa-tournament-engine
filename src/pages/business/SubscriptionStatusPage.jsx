import { useAuth } from '../../auth/useAuth'
import { useLanguage } from '../../i18n/LanguageContext'
import AppIcon from '../../components/common/AppIcon'
import ShinyText from '../../components/reactbits/ShinyText'
import SpotlightCard from '../../components/reactbits/SpotlightCard'

export default function SubscriptionStatusPage() {
  const { subscriptionExpired } = useAuth()
  const { t, language } = useLanguage()

  return (
    <section className="space-y-4">
      <SpotlightCard className="border border-white/10 bg-slate-950/80 p-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-sky-400/30 bg-sky-500/20 text-sky-400">
              <AppIcon name="receipt" size={22} />
            </div>
            <div>
              <ShinyText text={t('navSubscription')} className="text-lg font-bold text-white" />
              <p className="text-xs text-slate-400">{t('appSubtitle')}</p>
            </div>
          </div>

          <span
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase ${
              subscriptionExpired
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${subscriptionExpired ? 'bg-rose-400' : 'bg-emerald-400 animate-ping'}`} />
            {subscriptionExpired ? (language === 'ar' ? 'منتهي الصلاحية' : 'EXPIRED') : (language === 'ar' ? 'اشتراك نشط وفعال' : 'ACTIVE LICENSE')}
          </span>
        </div>

        <p className="mt-4 text-xs text-slate-400 leading-relaxed">
          {language === 'ar'
            ? 'تتيح لك منصة فيفا إدارة وتوليد ومزامنة البطولات الحية على شاشات العرض والتحكم بالأجهزة دون قيود أثناء سريان الاشتراك.'
            : 'Your active license gives you unlimited tournament generation, real-time stadium display streaming, and station timer management.'}
        </p>
      </SpotlightCard>
    </section>
  )
}
