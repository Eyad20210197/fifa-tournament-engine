import { Link } from 'react-router-dom'
import { useLanguage } from '../../i18n/LanguageContext'
import AppIcon from '../../components/common/AppIcon'
import ShinyText from '../../components/reactbits/ShinyText'
import SpotlightCard from '../../components/reactbits/SpotlightCard'

export default function TeamsPage() {
  const { t, language } = useLanguage()

  return (
    <section className="space-y-4">
      <SpotlightCard className="border border-white/10 bg-slate-950/80 p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-400/30 bg-sky-500/20 text-sky-400">
            <AppIcon name="users" size={20} />
          </div>
          <ShinyText text={t('teamRegistration')} className="text-lg font-bold text-white" />
        </div>

        <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
          {language === 'ar'
            ? 'تتم إدارة الفرق واللاعبين ومعايرة الجداول مباشرة من خلال معالج البطولة الذكي.'
            : 'Teams, rosters, and match allocations are managed directly through the Smart Tournament Wizard.'}
        </p>

        <div className="mt-5">
          <Link
            to="/saas/schedule"
            className="inline-flex items-center gap-2 rounded-xl border border-sky-400 bg-sky-500 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-[0_0_20px_rgba(56,189,248,0.3)] transition hover:bg-sky-400"
          >
            <AppIcon name="trophy" size={15} />
            <span>{language === 'ar' ? 'الانتقال إلى إدارة البطولة والفرق' : 'Go to Tournament & Team Manager'}</span>
          </Link>
        </div>
      </SpotlightCard>
    </section>
  )
}
