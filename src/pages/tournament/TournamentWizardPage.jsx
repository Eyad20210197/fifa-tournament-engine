import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createTournament } from '../../services/tournamentService'
import { upsertFinancialSetup } from '../../services/financeService'
import { useUiStore } from '../../store/uiStore'
import { useLanguage } from '../../i18n/LanguageContext'
import {
  calibrateTournament,
  autoCalibrateSettings,
  isPowerOfTwo,
} from '../../utils/tournament/calibrationEngine'
import AppIcon from '../../components/common/AppIcon'
import ShinyText from '../../components/reactbits/ShinyText'
import SpotlightCard from '../../components/reactbits/SpotlightCard'
import TournamentCalibrationWidget from '../../components/tournament/TournamentCalibrationWidget'

const DRAFT_KEY = 'fifaWizardDraftV3'

const DEMO_CLUBS = [
  { name: 'ريال مدريد', club: 'Real Madrid CF', p1: 'Eyad (C)', p2: 'Ahmed' },
  { name: 'مانشستر سيتي', club: 'Manchester City', p1: 'Omar (C)', p2: 'Youssef' },
  { name: 'برشلونة', club: 'FC Barcelona', p1: 'Karim (C)', p2: 'Mostafa' },
  { name: 'بايرن ميونخ', club: 'FC Bayern Munich', p1: 'Hassan (C)', p2: 'Ali' },
  { name: 'ليفربول', club: 'Liverpool FC', p1: 'Mohamed (C)', p2: 'Tarek' },
  { name: 'باريس سان جيرمان', club: 'Paris Saint-Germain', p1: 'Ziad (C)', p2: 'Amr' },
  { name: 'أرسنال', club: 'Arsenal FC', p1: 'Marwan (C)', p2: 'Khaled' },
  { name: 'إنتر ميلان', club: 'Inter Milan', p1: 'Sherif (C)', p2: 'Mahmoud' },
]

function emptyTeam() {
  return {
    team_name: '',
    club_name: '',
    player1: '',
    player2: '',
  }
}

function initialDraft(savedDraft) {
  return (
    savedDraft || {
      name: '',
      format: 'دوري',
      game_mode: '1v1',
      starts_at: '',
      sponsor_logo_url: '',
      home_away_enabled: false,
      home_away_stages: ['league'],
      available_consoles: 2,
      match_duration_minutes: 10,
      turnover_buffer_minutes: 2,
      tournament_duration_hours: 8,
      teams: [emptyTeam(), emptyTeam(), emptyTeam(), emptyTeam()],
      financial: {
        entry_fee: '100',
        sponsor_amount: '1000',
        expected_teams: '8',
        hour_rate: '80',
      },
    }
  )
}

export default function TournamentWizardPage() {
  const navigate = useNavigate()
  const { t, language, isRtl } = useLanguage()

  const savedDraft = useUiStore((state) => state.wizardDraft)
  const saveWizardDraft = useUiStore((state) => state.saveWizardDraft)
  const clearWizardDraft = useUiStore((state) => state.clearWizardDraft)

  const [stepIndex, setStepIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [draft, setDraft] = useState(() => {
    try {
      const localDraft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null')
      return initialDraft(savedDraft || localDraft)
    } catch {
      return initialDraft(savedDraft)
    }
  })

  const steps = [
    { label: t('step1Basic'), icon: 'trophy' },
    { label: t('step4Calibration'), icon: 'timer' },
    { label: t('step2Financial'), icon: 'dollar' },
    { label: t('step3Teams'), icon: 'users' },
    { label: t('step5Review'), icon: 'check' },
  ]

  const isLastStep = stepIndex === steps.length - 1
  const validTeams = useMemo(
    () => draft.teams.filter((team) => team.team_name.trim()),
    [draft.teams]
  )

  useEffect(() => {
    saveWizardDraft(draft)
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
    } catch {
      // ignore
    }
  }, [draft, saveWizardDraft])

  // Live Calibration
  const calibration = useMemo(() => {
    return calibrateTournament({
      format: draft.format,
      teamCount: validTeams.length || 8,
      homeAwayEnabled: draft.home_away_enabled,
      availableConsoles: draft.available_consoles || 1,
      matchDurationMinutes: draft.match_duration_minutes || 10,
      turnoverBufferMinutes: draft.turnover_buffer_minutes || 2,
      tournamentDurationHours: draft.tournament_duration_hours || 8,
    })
  }, [draft, validTeams.length])

  function handleAutoCalibrate() {
    const optimized = autoCalibrateSettings({
      format: draft.format,
      teamsCount: validTeams.length || 8,
      home_away_enabled: draft.home_away_enabled,
      available_consoles: draft.available_consoles || 1,
      match_duration_minutes: draft.match_duration_minutes || 10,
      turnover_buffer_minutes: draft.turnover_buffer_minutes || 2,
      tournament_duration_hours: draft.tournament_duration_hours || 8,
    })

    setDraft((prev) => ({
      ...prev,
      format: optimized.format,
      home_away_enabled: optimized.home_away_enabled,
      available_consoles: optimized.available_consoles,
      match_duration_minutes: optimized.match_duration_minutes,
      tournament_duration_hours: optimized.tournament_duration_hours,
    }))
    setError('')
  }

  function handleApplyCalibrationPatch(patch) {
    setDraft((prev) => ({ ...prev, ...patch }))
    setError('')
  }

  function validateStep(index = stepIndex) {
    if (index === 0) {
      if (!draft.name.trim()) return language === 'ar' ? 'يرجى إدخال اسم البطولة.' : 'Please enter a tournament name.'
      if (!draft.format) return language === 'ar' ? 'يرجى اختيار نمط البطولة.' : 'Please select a tournament format.'
    }

    if (index === 1) {
      // Step 2 (Calibration & Rules)
      if (draft.format === 'خروج مغلوب' && validTeams.length > 0 && !isPowerOfTwo(validTeams.length)) {
        return language === 'ar'
          ? `قاعدة الإقصائيات: عدد الفرق (${validTeams.length}) لا يطابق مضاعفات القوة 2 (2، 4، 8، 16، 32، 64). يرجى تحويل النمط إلى دوري أو تعديل الفرق.`
          : `Knockout Rule: Team count (${validTeams.length}) must be a power of 2 (2, 4, 8, 16, 32, 64). Please switch to League or adjust team count.`
      }
    }

    if (index === 3) {
      if (validTeams.length < 2) return language === 'ar' ? 'يجب تسجيل فريقين على الأقل.' : 'At least 2 teams are required.'
      if (validTeams.length > 128) return language === 'ar' ? 'الحد الأقصى للفرق هو 128 فريقاً.' : 'Maximum 128 teams supported.'
      if (draft.format === 'خروج مغلوب' && !isPowerOfTwo(validTeams.length)) {
        return language === 'ar'
          ? `قاعدة خروج المغلوب: عدد الفرق الحالي (${validTeams.length}) غير متوافق مع شجرة الكأس. يجب أن يكون 2، 4، 8، 16، 32، 64، 128.`
          : `Knockout Rule: Current team count (${validTeams.length}) is invalid for single elimination. Must be 2, 4, 8, 16, 32, 64, 128.`
      }
    }

    return ''
  }

  function nextStep() {
    const issue = validateStep(stepIndex)
    if (issue) {
      setError(issue)
      return
    }
    setError('')
    setStepIndex((val) => Math.min(steps.length - 1, val + 1))
  }

  function prevStep() {
    setError('')
    setStepIndex((val) => Math.max(0, val - 1))
  }

  function fillDemoTeams() {
    const demo = DEMO_CLUBS.map((c) => ({
      team_name: c.name,
      club_name: c.club,
      player1: c.p1,
      player2: c.p2,
    }))
    setDraft((prev) => ({ ...prev, teams: demo }))
  }

  async function submit() {
    const issue = validateStep(0) || validateStep(1) || validateStep(3)
    if (issue) {
      setError(issue)
      return
    }

    setLoading(true)
    setError('')

    try {
      const tournament = await createTournament({
        name: draft.name,
        format: draft.format,
        starts_at: draft.starts_at || null,
        sponsor_logo_url: draft.sponsor_logo_url || null,
        home_away_enabled: Boolean(draft.home_away_enabled),
        home_away_stages: draft.home_away_enabled ? draft.home_away_stages : [],
        teams: validTeams,
      })

      if (draft.financial) {
        await upsertFinancialSetup({
          tournament_id: tournament.id,
          entry_fee: Number(draft.financial.entry_fee || 0),
          sponsor_amount: Number(draft.financial.sponsor_amount || 0),
          expected_teams: Number(validTeams.length || draft.financial.expected_teams || 8),
          hour_rate: Number(draft.financial.hour_rate || 0),
          match_duration_minutes: Number(draft.match_duration_minutes || 10),
        })
      }

      clearWizardDraft()
      localStorage.removeItem(DRAFT_KEY)
      navigate('/saas/tournaments', { replace: true })
    } catch (requestError) {
      setError(requestError?.response?.data?.message || (language === 'ar' ? 'تعذر إنشاء البطولة.' : 'Failed to create tournament.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="space-y-5">
      {/* Title & Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-sky-400/40 bg-sky-500/20 text-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.3)]">
            <AppIcon name="trophy" size={24} />
          </div>
          <div>
            <ShinyText text={t('wizardTitle')} className="text-xl font-black text-white" />
            <p className="text-xs text-slate-400">{t('appSubtitle')}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={fillDemoTeams}
          className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs font-bold text-amber-300 transition hover:bg-amber-500/20 active:scale-95"
        >
          <AppIcon name="sparkles" size={15} />
          <span>{t('quickFillDemoTeams')}</span>
        </button>
      </div>

      {/* Step Indicator Bar */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {steps.map((step, idx) => {
          const active = idx === stepIndex
          const done = idx < stepIndex
          return (
            <button
              key={idx}
              type="button"
              onClick={() => setStepIndex(idx)}
              className={`flex items-center gap-2.5 rounded-xl border p-3 text-xs font-bold transition-all ${
                active
                  ? 'border-sky-400 bg-sky-500/20 text-sky-300 shadow-[0_0_20px_rgba(56,189,248,0.2)]'
                  : done
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                  : 'border-white/10 bg-slate-900/60 text-slate-400 hover:border-white/20'
              }`}
            >
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-lg ${
                  active ? 'bg-sky-400 text-black' : done ? 'bg-emerald-400 text-black' : 'bg-white/10 text-slate-400'
                }`}
              >
                <AppIcon name={done ? 'check' : step.icon} size={13} />
              </div>
              <span className="truncate">{step.label}</span>
            </button>
          )
        })}
      </div>

      {/* Error Alert */}
      {error ? (
        <div className="flex items-center gap-2.5 rounded-xl border border-rose-500/50 bg-rose-500/15 p-3.5 text-xs font-bold text-rose-200">
          <AppIcon name="alert" size={16} className="text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {/* STEP CONTENT CONTAINER */}
      <SpotlightCard className="border border-white/10 bg-slate-950/80 p-5 backdrop-blur-xl">
        {/* STEP 1: Basic Info & Format */}
        {stepIndex === 0 ? (
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-sky-400 flex items-center gap-2">
              <AppIcon name="trophy" size={16} />
              <span>{t('step1Basic')}</span>
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-300">{t('tournamentName')}</label>
                <input
                  className="w-full rounded-xl border border-white/15 bg-slate-900/80 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none"
                  placeholder={t('tournamentNamePlaceholder')}
                  value={draft.name}
                  onChange={(e) => setDraft((s) => ({ ...s, name: e.target.value }))}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-300">{t('tournamentFormat')}</label>
                <select
                  className="w-full rounded-xl border border-white/15 bg-slate-900/80 px-3.5 py-2.5 text-sm text-white focus:border-sky-400 focus:outline-none"
                  value={draft.format}
                  onChange={(e) => setDraft((s) => ({ ...s, format: e.target.value }))}
                >
                  <option value="دوري">{t('formatLeague')}</option>
                  <option value="خروج مغلوب">{t('formatKnockout')}</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-300">{t('gameMode')}</label>
                <select
                  className="w-full rounded-xl border border-white/15 bg-slate-900/80 px-3.5 py-2.5 text-sm text-white focus:border-sky-400 focus:outline-none"
                  value={draft.game_mode}
                  onChange={(e) => setDraft((s) => ({ ...s, game_mode: e.target.value }))}
                >
                  <option value="1v1">{t('mode1v1')}</option>
                  <option value="2v2">{t('mode2v2')}</option>
                  <option value="5v5">{t('mode5v5')}</option>
                  <option value="11v11">{t('mode11v11')}</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-300">{t('tournamentStartTime')}</label>
                <input
                  type="datetime-local"
                  className="w-full rounded-xl border border-white/15 bg-slate-900/80 px-3.5 py-2.5 text-sm text-white focus:border-sky-400 focus:outline-none"
                  value={draft.starts_at}
                  onChange={(e) => setDraft((s) => ({ ...s, starts_at: e.target.value }))}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-bold text-slate-300">{t('sponsorLogoUrl')}</label>
                <input
                  className="w-full rounded-xl border border-white/15 bg-slate-900/80 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none"
                  placeholder="https://.../sponsor-logo.png"
                  value={draft.sponsor_logo_url}
                  onChange={(e) => setDraft((s) => ({ ...s, sponsor_logo_url: e.target.value }))}
                />
              </div>

              {/* Home & Away Toggle */}
              <div className="sm:col-span-2 rounded-xl border border-white/10 bg-slate-900/50 p-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-700 text-sky-500 focus:ring-sky-400"
                    checked={draft.home_away_enabled}
                    onChange={(e) => setDraft((s) => ({ ...s, home_away_enabled: e.target.checked }))}
                  />
                  <div>
                    <p className="text-sm font-bold text-white flex items-center gap-2">
                      <AppIcon name="exchange" size={16} className="text-sky-400" />
                      <span>{t('homeAwayTitle')}</span>
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {draft.home_away_enabled ? t('homeAwayDouble') : t('homeAwaySingle')}
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        ) : null}

        {/* STEP 2: Time, Consoles & Smart Calibration */}
        {stepIndex === 1 ? (
          <div className="space-y-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-sky-400 flex items-center gap-2">
              <AppIcon name="timer" size={16} />
              <span>{t('step4Calibration')}</span>
            </h3>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-300">
                  {t('availableConsoles')}
                </label>
                <input
                  type="number"
                  min="1"
                  max="32"
                  className="w-full rounded-xl border border-white/15 bg-slate-900/80 px-3.5 py-2.5 text-sm text-white focus:border-sky-400 focus:outline-none"
                  value={draft.available_consoles}
                  onChange={(e) => setDraft((s) => ({ ...s, available_consoles: Number(e.target.value) || 1 }))}
                />
                <p className="mt-1 text-[11px] text-slate-500">{t('availableConsolesHint')}</p>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-300">
                  {t('matchDurationMinutes')}
                </label>
                <input
                  type="number"
                  min="4"
                  max="60"
                  className="w-full rounded-xl border border-white/15 bg-slate-900/80 px-3.5 py-2.5 text-sm text-white focus:border-sky-400 focus:outline-none"
                  value={draft.match_duration_minutes}
                  onChange={(e) => setDraft((s) => ({ ...s, match_duration_minutes: Number(e.target.value) || 10 }))}
                />
                <p className="mt-1 text-[11px] text-slate-500">{t('matchDurationHint')}</p>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-300">
                  {t('tournamentDurationHours')}
                </label>
                <input
                  type="number"
                  min="1"
                  max="72"
                  step="0.5"
                  className="w-full rounded-xl border border-white/15 bg-slate-900/80 px-3.5 py-2.5 text-sm text-white focus:border-sky-400 focus:outline-none"
                  value={draft.tournament_duration_hours}
                  onChange={(e) => setDraft((s) => ({ ...s, tournament_duration_hours: Number(e.target.value) || 8 }))}
                />
                <p className="mt-1 text-[11px] text-slate-500">{t('tournamentDurationHint')}</p>
              </div>
            </div>

            {/* Live Interactive Calibration Widget */}
            <TournamentCalibrationWidget
              config={{
                format: draft.format,
                teamsCount: validTeams.length || 8,
                home_away_enabled: draft.home_away_enabled,
                available_consoles: draft.available_consoles,
                match_duration_minutes: draft.match_duration_minutes,
                turnover_buffer_minutes: draft.turnover_buffer_minutes,
                tournament_duration_hours: draft.tournament_duration_hours,
              }}
              onApplyPatch={handleApplyCalibrationPatch}
              onAutoCalibrate={handleAutoCalibrate}
            />
          </div>
        ) : null}

        {/* STEP 3: Financial Setup */}
        {stepIndex === 2 ? (
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-sky-400 flex items-center gap-2">
              <AppIcon name="dollar" size={16} />
              <span>{t('step2Financial')}</span>
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-300">{t('entryFee')}</label>
                <input
                  type="number"
                  className="w-full rounded-xl border border-white/15 bg-slate-900/80 px-3.5 py-2.5 text-sm text-white focus:border-sky-400 focus:outline-none"
                  value={draft.financial.entry_fee}
                  onChange={(e) => setDraft((s) => ({ ...s, financial: { ...s.financial, entry_fee: e.target.value } }))}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-300">{t('sponsorAmount')}</label>
                <input
                  type="number"
                  className="w-full rounded-xl border border-white/15 bg-slate-900/80 px-3.5 py-2.5 text-sm text-white focus:border-sky-400 focus:outline-none"
                  value={draft.financial.sponsor_amount}
                  onChange={(e) => setDraft((s) => ({ ...s, financial: { ...s.financial, sponsor_amount: e.target.value } }))}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-300">{t('hourRate')}</label>
                <input
                  type="number"
                  className="w-full rounded-xl border border-white/15 bg-slate-900/80 px-3.5 py-2.5 text-sm text-white focus:border-sky-400 focus:outline-none"
                  value={draft.financial.hour_rate}
                  onChange={(e) => setDraft((s) => ({ ...s, financial: { ...s.financial, hour_rate: e.target.value } }))}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-300">{t('prizePool')}</label>
                <div className="flex h-11 items-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 text-sm font-bold text-emerald-300">
                  {((Number(draft.financial.entry_fee) || 0) * (validTeams.length || 8) + (Number(draft.financial.sponsor_amount) || 0) * 0.7).toLocaleString()} EGP
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* STEP 4: Teams Registration */}
        {stepIndex === 3 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-sky-400 flex items-center gap-2">
                <AppIcon name="users" size={16} />
                <span>{t('step3Teams')} ({validTeams.length})</span>
              </h3>

              <button
                type="button"
                onClick={() => setDraft((s) => ({ ...s, teams: [...s.teams, emptyTeam()] }))}
                className="flex items-center gap-1.5 rounded-xl border border-sky-500/40 bg-sky-500/20 px-3 py-1.5 text-xs font-bold text-sky-300 transition hover:bg-sky-500/30 active:scale-95"
              >
                <AppIcon name="plus" size={14} />
                <span>{t('addTeam')}</span>
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 max-h-[480px] overflow-y-auto pr-1">
              {draft.teams.map((team, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-white/10 bg-slate-900/60 p-3.5 space-y-2.5 transition hover:border-white/20"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">
                      {language === 'ar' ? `فريق ${idx + 1}` : `Team #${idx + 1}`}
                    </span>
                    {draft.teams.length > 2 ? (
                      <button
                        type="button"
                        onClick={() =>
                          setDraft((s) => ({
                            ...s,
                            teams: s.teams.filter((_, tIdx) => tIdx !== idx),
                          }))
                        }
                        className="text-rose-400 hover:text-rose-300 p-1"
                        title={t('removeTeam')}
                      >
                        <AppIcon name="trash" size={14} />
                      </button>
                    ) : null}
                  </div>

                  <input
                    className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none"
                    placeholder={t('teamName')}
                    value={team.team_name}
                    onChange={(e) => {
                      const val = e.target.value
                      setDraft((s) => ({
                        ...s,
                        teams: s.teams.map((t, tIdx) => (tIdx === idx ? { ...t, team_name: val } : t)),
                      }))
                    }}
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none"
                      placeholder={t('clubName')}
                      value={team.club_name}
                      onChange={(e) => {
                        const val = e.target.value
                        setDraft((s) => ({
                          ...s,
                          teams: s.teams.map((t, tIdx) => (tIdx === idx ? { ...t, club_name: val } : t)),
                        }))
                      }}
                    />
                    <input
                      className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none"
                      placeholder={t('player1Name')}
                      value={team.player1}
                      onChange={(e) => {
                        const val = e.target.value
                        setDraft((s) => ({
                          ...s,
                          teams: s.teams.map((t, tIdx) => (tIdx === idx ? { ...t, player1: val } : t)),
                        }))
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* STEP 5: Review & Confirmation */}
        {stepIndex === 4 ? (
          <div className="space-y-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-sky-400 flex items-center gap-2">
              <AppIcon name="check" size={16} />
              <span>{t('step5Review')}</span>
            </h3>

            <div className="grid gap-3 sm:grid-cols-2 text-xs">
              <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4 space-y-2">
                <p className="text-slate-400">{t('tournamentName')}: <strong className="text-white text-sm">{draft.name || '--'}</strong></p>
                <p className="text-slate-400">{t('tournamentFormat')}: <strong className="text-sky-300">{draft.format} ({draft.home_away_enabled ? t('homeAwayDouble') : t('homeAwaySingle')})</strong></p>
                <p className="text-slate-400">{t('gameMode')}: <strong className="text-white">{draft.game_mode}</strong></p>
                <p className="text-slate-400">{t('totalRegisteredTeams')}: <strong className="text-emerald-400">{validTeams.length}</strong></p>
              </div>

              <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4 space-y-2">
                <p className="text-slate-400">{t('availableConsoles')}: <strong className="text-white">{draft.available_consoles} PS5</strong></p>
                <p className="text-slate-400">{t('matchDurationMinutes')}: <strong className="text-white">{draft.match_duration_minutes} {language === 'ar' ? 'دقيقة' : 'mins'}</strong></p>
                <p className="text-slate-400">{t('estimatedWallClockHours')}: <strong className="text-amber-300">{calibration.neededHours} {language === 'ar' ? 'ساعة' : 'hours'}</strong></p>
                <p className="text-slate-400">{t('status')}: <strong className={calibration.isCompatible ? 'text-emerald-400' : 'text-rose-400'}>{calibration.isCompatible ? t('calibrationStatusCompatible') : t('calibrationStatusIncompatible')}</strong></p>
              </div>
            </div>
          </div>
        ) : null}
      </SpotlightCard>

      {/* Bottom Step Navigation Buttons */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={prevStep}
          disabled={stepIndex === 0}
          className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-white/10 disabled:opacity-30"
        >
          <AppIcon name={isRtl ? 'right' : 'left'} size={15} />
          <span>{t('previous')}</span>
        </button>

        {!isLastStep ? (
          <button
            type="button"
            onClick={nextStep}
            className="flex items-center gap-2 rounded-xl border border-sky-400 bg-sky-500 px-6 py-2.5 text-xs font-bold text-slate-950 shadow-[0_0_20px_rgba(56,189,248,0.4)] transition hover:bg-sky-400 active:scale-95"
          >
            <span>{t('next')}</span>
            <AppIcon name={isRtl ? 'left' : 'right'} size={15} />
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={loading || !calibration.isCompatible}
            className="flex items-center gap-2 rounded-xl border border-emerald-400 bg-emerald-500 px-8 py-3 text-xs font-bold text-slate-950 shadow-[0_0_25px_rgba(16,185,129,0.5)] transition hover:bg-emerald-400 disabled:opacity-50 active:scale-95"
          >
            <AppIcon name="trophy" size={16} />
            <span>{loading ? t('loading') : (language === 'ar' ? 'إطلاق البطولة وتوليد المباريات' : 'Launch Tournament & Build Matches')}</span>
          </button>
        )}
      </div>
    </section>
  )
}
