import { useState } from 'react'
import { useLanguage } from '../i18n/LanguageContext'
import { usePrototypeStore } from '../store/prototypeStore'
import AppIcon from '../components/common/AppIcon'
import ShinyText from '../components/reactbits/ShinyText'
import SpotlightCard from '../components/reactbits/SpotlightCard'

export default function SchedulePage() {
  const { t, language } = useLanguage()
  const tournaments = usePrototypeStore((s) => s.tournaments)
  const teams = usePrototypeStore((s) => s.teams)
  const matches = usePrototypeStore((s) => s.matches)
  const teamById = new Map(teams.map((t) => [t.id, t]))

  const [activeTab, setActiveTab] = useState('rules') // 'rules' | 'teams' | 'fixtures' | 'progression'
  const [selectedTournament, setSelectedTournament] = useState(tournaments[0] || {})
  const [notice, setNotice] = useState('')

  const [form, setForm] = useState({
    name: selectedTournament.name || '',
    format: selectedTournament.format || 'دوري',
    progression_format: selectedTournament.progression_format || 'round_robin',
    home_away_enabled: Boolean(selectedTournament.home_away_enabled),
  })

  function showNotice(msg) {
    setNotice(msg)
    setTimeout(() => setNotice(''), 3500)
  }

  const tabs = [
    { id: 'rules', label: language === 'ar' ? 'الإعدادات والقواعد' : 'Rules & Format', icon: 'sliders' },
    { id: 'teams', label: language === 'ar' ? 'الفرق واللاعبين' : 'Teams Roster', icon: 'users' },
    { id: 'fixtures', label: language === 'ar' ? 'الجدول والمواعيد' : 'Fixtures & Timing', icon: 'calendar' },
    { id: 'progression', label: language === 'ar' ? 'التقدم والأدوار' : 'Progression', icon: 'trophy' },
  ]

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-6">
      {/* Top Header */}
      <SpotlightCard className="border border-white/10 bg-slate-950/80 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-sky-400/40 bg-sky-500/20 text-sky-400">
              <AppIcon name="calendar" size={22} />
            </div>
            <div>
              <ShinyText text={t('navSchedule')} className="text-xl font-black text-white" />
              <p className="text-xs text-slate-400">
                {language === 'ar' ? 'تخصيص قواعد البطولة، تسجيل الفرق، والجدولة التلقائية الذكية' : 'Tournament structure, rules, bulk auto-scheduler, and stage advancements'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-400">{t('activeTournament')}:</label>
            <select
              className="rounded-xl border border-sky-500/30 bg-slate-900 px-3.5 py-2 text-xs font-bold text-white focus:outline-none"
              value={selectedTournament.id}
              onChange={(e) => {
                const found = tournaments.find((item) => item.id === Number(e.target.value))
                if (found) {
                  setSelectedTournament(found)
                  setForm({
                    name: found.name,
                    format: found.format,
                    progression_format: found.progression_format,
                    home_away_enabled: Boolean(found.home_away_enabled),
                  })
                }
              }}
            >
              {tournaments.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === tab.id
                  ? 'border border-sky-400 bg-sky-500/20 text-sky-300 shadow-[0_0_20px_rgba(56,189,248,0.25)]'
                  : 'border border-transparent bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              <AppIcon name={tab.icon} size={14} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </SpotlightCard>

      {notice && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/15 p-3.5 text-xs font-bold text-emerald-200">
          <AppIcon name="check" size={16} className="text-emerald-400" />
          <span>{notice}</span>
        </div>
      )}

      {/* TAB 1: RULES & FORMAT */}
      {activeTab === 'rules' && (
        <SpotlightCard className="border border-white/10 p-6 space-y-5">
          <h3 className="text-sm font-bold uppercase tracking-wider text-sky-400 flex items-center gap-2">
            <AppIcon name="sliders" size={16} />
            <span>{language === 'ar' ? 'القواعد ونمط المنافسة' : 'Tournament Format & Game Rules'}</span>
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-300">{t('tournamentName')}</label>
              <input
                className="w-full rounded-xl border border-white/15 bg-slate-900 px-3.5 py-2.5 text-xs text-white focus:border-sky-400 focus:outline-none"
                value={form.name}
                onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-300">{t('tournamentFormat')}</label>
              <select
                className="w-full rounded-xl border border-white/15 bg-slate-900 px-3.5 py-2.5 text-xs text-white focus:border-sky-400 focus:outline-none"
                value={form.format}
                onChange={(e) => setForm((s) => ({ ...s, format: e.target.value }))}
              >
                <option value="دوري">{t('league')}</option>
                <option value="خروج مغلوب">{t('knockout')}</option>
              </select>
            </div>

            <div className="sm:col-span-2 rounded-xl border border-white/10 bg-slate-900/50 p-4 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-700 text-sky-500"
                  checked={form.home_away_enabled}
                  onChange={(e) => setForm((s) => ({ ...s, home_away_enabled: e.target.checked }))}
                />
                <div>
                  <p className="text-xs font-bold text-white flex items-center gap-1.5">
                    <AppIcon name="exchange" size={15} className="text-sky-400" />
                    <span>{form.home_away_enabled ? t('homeAway') : t('singleLeg')}</span>
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {language === 'ar'
                      ? 'تمكين خيار الذهاب والإياب لمضاعفة حماس المباريات والتأهل الإجمالي'
                      : 'Enable two-legged home and away matches with aggregate scoring'}
                  </p>
                </div>
              </label>
            </div>

            <div className="sm:col-span-2 pt-2">
              <button
                type="button"
                onClick={() => showNotice(language === 'ar' ? 'تم حفظ القواعد والإعدادات بنجاح!' : 'Tournament rules saved!')}
                className="flex items-center gap-2 rounded-xl border border-sky-400 bg-sky-500 px-6 py-2.5 text-xs font-bold text-slate-950 shadow-[0_0_15px_rgba(56,189,248,0.3)] hover:bg-sky-400"
              >
                <AppIcon name="save" size={15} />
                <span>{t('save')}</span>
              </button>
            </div>
          </div>
        </SpotlightCard>
      )}

      {/* TAB 2: TEAMS */}
      {activeTab === 'teams' && (
        <SpotlightCard className="border border-white/10 p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-sky-400 flex items-center gap-2">
              <AppIcon name="users" size={16} />
              <span>{language === 'ar' ? `قائمة الفرق المشاركة (${teams.length})` : `Registered Teams (${teams.length})`}</span>
            </h3>

            <button
              type="button"
              onClick={() => showNotice(language === 'ar' ? 'تم استيراد الفرق بنجاح!' : 'Teams imported from Excel!')}
              className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/10"
            >
              <AppIcon name="download" size={13} />
              <span>{language === 'ar' ? 'استيراد من Excel' : 'Import Excel'}</span>
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {teams.map((tItem, idx) => (
              <div key={tItem.id} className="rounded-xl border border-white/10 bg-slate-900/60 p-3.5 space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400">#{idx + 1}</span>
                <p className="text-xs font-black text-white">{tItem.team_name}</p>
                <p className="text-[11px] text-slate-400">{tItem.club_name}</p>
              </div>
            ))}
          </div>
        </SpotlightCard>
      )}

      {/* TAB 3: FIXTURES */}
      {activeTab === 'fixtures' && (
        <SpotlightCard className="border border-white/10 p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-sky-400 flex items-center gap-2">
              <AppIcon name="calendar" size={16} />
              <span>{language === 'ar' ? 'الجدول الزمني والمواعيد' : 'Fixtures & Timing'}</span>
            </h3>

            <button
              type="button"
              onClick={() => showNotice(language === 'ar' ? 'تم تطبيق الجدولة التلقائية بفارق 15 دقيقة لكل مباراة!' : 'Bulk schedule applied: 15-min intervals!')}
              className="flex items-center gap-1.5 rounded-xl border border-sky-400 bg-sky-500 px-4 py-2 text-xs font-black text-slate-950 shadow-[0_0_15px_rgba(56,189,248,0.3)] hover:bg-sky-400"
            >
              <AppIcon name="sparkles" size={14} />
              <span>{language === 'ar' ? 'الجدولة التلقائية الذكية' : 'Smart Auto-Schedule'}</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {matches.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between p-3.5 rounded-xl border border-white/10 bg-slate-900/60"
              >
                <div className="flex items-center gap-3">
                  <span className="rounded-lg bg-black/50 px-2 py-1 font-mono text-xs font-bold text-slate-400">
                    #{m.id}
                  </span>
                  <div>
                    <p className="text-xs font-bold text-white">
                      {teamById.get(m.home_team_id)?.team_name || 'Team 1'}{' '}
                      <span className="text-amber-400 font-mono">VS</span>{' '}
                      {teamById.get(m.away_team_id)?.team_name || 'Team 2'}
                    </p>
                    <p className="text-[10px] text-slate-400">{m.stage_name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-slate-300 font-bold">18:00 +15m</span>
                  <span className="rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 text-[10px] font-bold">
                    Station #{m.station_id || 1}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </SpotlightCard>
      )}

      {/* TAB 4: PROGRESSION */}
      {activeTab === 'progression' && (
        <SpotlightCard className="border border-white/10 p-6 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-sky-400 flex items-center gap-2">
            <AppIcon name="trophy" size={16} />
            <span>{language === 'ar' ? 'التقدم نحو الأدوار الإقصائية والنهائي' : 'Stage Progression & Advancements'}</span>
          </h3>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
              <span className="text-xs text-slate-400">{language === 'ar' ? 'حالة الجولة الحالية' : 'Round Status'}</span>
              <p className="text-lg font-black text-emerald-400 mt-1">
                {language === 'ar' ? 'مباريات مباشرة قيد اللعب' : 'Live Matches In Progress'}
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
              <span className="text-xs text-slate-400">{language === 'ar' ? 'المباريات المكتملة' : 'Completed Matches'}</span>
              <p className="text-lg font-black text-white mt-1">2 / 5</p>
            </div>

            <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
              <span className="text-xs text-slate-400">{language === 'ar' ? 'نسبة التقدم' : 'Completion'}</span>
              <p className="text-lg font-black text-sky-400 mt-1 font-mono">40%</p>
            </div>
          </div>
        </SpotlightCard>
      )}
    </div>
  )
}
