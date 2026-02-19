import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createTournament } from '../../services/tournamentService'
import { upsertFinancialSetup } from '../../services/financeService'
import { useUiStore } from '../../store/uiStore'
import { formatArabicNumber } from '../../utils/format'

const DRAFT_KEY = 'wizardDraftV2'

const steps = [
  'بيانات البطولة',
  'الإعداد المالي',
  'الفرق',
  'الجدولة',
  'المراجعة النهائية',
]

function emptyTeam() {
  return {
    team_name: '',
    club_name: '',
  }
}

function initialDraft(savedDraft) {
  return (
    savedDraft || {
      name: '',
      format: 'دوري',
      starts_at: '',
      sponsor_logo_url: '',
      teams: [emptyTeam(), emptyTeam()],
      financial: {
        entry_fee: '',
        sponsor_amount: '',
        expected_teams: '',
      },
    }
  )
}

export default function TournamentWizardPage() {
  const navigate = useNavigate()
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

  const isLastStep = useMemo(() => stepIndex === steps.length - 1, [stepIndex])
  const validTeams = useMemo(() => draft.teams.filter((team) => team.team_name.trim()), [draft.teams])

  useEffect(() => {
    saveWizardDraft(draft)
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  }, [draft, saveWizardDraft])

  function validateStep(index = stepIndex) {
    if (index === 0) {
      if (!draft.name.trim()) return 'يرجى إدخال اسم البطولة.'
      if (!draft.format) return 'يرجى اختيار نمط البطولة.'
    }

    if (index === 2) {
      if (validTeams.length < 2) return 'يجب إضافة فريقين على الأقل.'
      if (validTeams.length > 128) return 'الحد الأقصى للفرق هو 128 فريقا.'
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
    setStepIndex((value) => Math.min(steps.length - 1, value + 1))
  }

  function prevStep() {
    setError('')
    setStepIndex((value) => Math.max(0, value - 1))
  }

  async function saveAsDraft() {
    const issue = validateStep(0)
    if (issue) {
      setError(issue)
      return
    }

    setError('')
    setLoading(true)

    try {
      const tournament = await createTournament({
        name: draft.name || 'بطولة جديدة',
        format: draft.format,
        starts_at: draft.starts_at || null,
        sponsor_logo_url: draft.sponsor_logo_url || null,
        teams: validTeams,
      })

      if (draft.financial.expected_teams || draft.financial.entry_fee || draft.financial.sponsor_amount) {
        await upsertFinancialSetup({
          tournament_id: tournament.id,
          entry_fee: Number(draft.financial.entry_fee || 0),
          sponsor_amount: Number(draft.financial.sponsor_amount || 0),
          expected_teams: Number(draft.financial.expected_teams || 0),
        })
      }

      clearWizardDraft()
      localStorage.removeItem(DRAFT_KEY)
      navigate('/saas/tournaments', { replace: true })
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'تعذر حفظ المسودة.')
    } finally {
      setLoading(false)
    }
  }

  async function submit() {
    const issue = validateStep(0) || validateStep(2)
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
        teams: validTeams,
      })

      await upsertFinancialSetup({
        tournament_id: tournament.id,
        entry_fee: Number(draft.financial.entry_fee || 0),
        sponsor_amount: Number(draft.financial.sponsor_amount || 0),
        expected_teams: Number(draft.financial.expected_teams || 0),
      })

      clearWizardDraft()
      localStorage.removeItem(DRAFT_KEY)
      navigate('/saas/tournaments', { replace: true })
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'تعذر إنشاء البطولة.')
    } finally {
      setLoading(false)
    }
  }

  function updateTeam(index, patch) {
    setDraft((state) => ({
      ...state,
      teams: state.teams.map((team, teamIndex) => (teamIndex === index ? { ...team, ...patch } : team)),
    }))
  }

  function addTeam() {
    setDraft((state) => ({ ...state, teams: [...state.teams, emptyTeam()] }))
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">معالج إنشاء البطولة</h2>
        <button
          className="min-h-11 rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm disabled:opacity-60"
          onClick={saveAsDraft}
          disabled={loading}
        >
          حفظ كمسودة
        </button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-sm text-[var(--text-secondary)]">
          الخطوة {formatArabicNumber(stepIndex + 1)} من {formatArabicNumber(steps.length)}
        </p>
        <p className="mt-1 text-lg font-semibold">{steps[stepIndex]}</p>

        <div className="mt-4 grid gap-2 md:grid-cols-5">
          {steps.map((label, index) => (
            <div
              key={label}
              className={[
                'rounded-xl border px-3 py-2 text-center text-xs',
                index === stepIndex
                  ? 'border-[var(--primary-color)]/55 bg-[var(--primary-color)]/12 text-[var(--secondary-color)]'
                  : 'border-white/10 bg-black/20 text-[var(--text-secondary)]',
              ].join(' ')}
            >
              {label}
            </div>
          ))}
        </div>
      </div>

      {error ? <p className="rounded-xl border border-rose-300/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p> : null}

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        {stepIndex === 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              placeholder="اسم البطولة"
              value={draft.name}
              onChange={(event) => setDraft((state) => ({ ...state, name: event.target.value }))}
            />
            <select
              className="min-h-11 rounded-2xl border border-white/15 bg-black/25 px-3 py-2"
              value={draft.format}
              onChange={(event) => setDraft((state) => ({ ...state, format: event.target.value }))}
            >
              <option value="دوري">دوري</option>
              <option value="خروج مغلوب">خروج مغلوب</option>
            </select>
            <input
              type="datetime-local"
              className="min-h-11 rounded-2xl border border-white/15 bg-black/25 px-3 py-2 sm:col-span-2"
              value={draft.starts_at}
              onChange={(event) => setDraft((state) => ({ ...state, starts_at: event.target.value }))}
            />
            <Field
              placeholder="رابط شعار الراعي"
              value={draft.sponsor_logo_url}
              onChange={(event) => setDraft((state) => ({ ...state, sponsor_logo_url: event.target.value }))}
            />
          </div>
        ) : null}

        {stepIndex === 1 ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <Field
              placeholder="رسوم التسجيل"
              value={draft.financial.entry_fee}
              onChange={(event) =>
                setDraft((state) => ({
                  ...state,
                  financial: { ...state.financial, entry_fee: event.target.value },
                }))
              }
            />
            <Field
              placeholder="مبلغ الرعاية"
              value={draft.financial.sponsor_amount}
              onChange={(event) =>
                setDraft((state) => ({
                  ...state,
                  financial: { ...state.financial, sponsor_amount: event.target.value },
                }))
              }
            />
            <Field
              placeholder="عدد الفرق المتوقع"
              value={draft.financial.expected_teams}
              onChange={(event) =>
                setDraft((state) => ({
                  ...state,
                  financial: { ...state.financial, expected_teams: event.target.value },
                }))
              }
            />
          </div>
        ) : null}

        {stepIndex === 2 ? (
          <div className="space-y-3">
            {draft.teams.map((team, index) => (
              <div key={index} className="grid gap-3 sm:grid-cols-2">
                <Field
                  placeholder={`اسم الفريق ${formatArabicNumber(index + 1)}`}
                  value={team.team_name}
                  onChange={(event) => updateTeam(index, { team_name: event.target.value })}
                />
                <Field
                  placeholder="اسم النادي"
                  value={team.club_name}
                  onChange={(event) => updateTeam(index, { club_name: event.target.value })}
                />
              </div>
            ))}
            <button className="min-h-11 rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm" onClick={addTeam}>
              إضافة فريق
            </button>
          </div>
        ) : null}

        {stepIndex === 3 ? (
          <p className="text-sm text-[var(--text-secondary)]">يتم توليد جدول المباريات تلقائيا بعد حفظ البطولة بحسب النمط المحدد.</p>
        ) : null}

        {stepIndex === 4 ? (
          <div className="space-y-2 text-sm text-[var(--text-primary)]">
            <p>اسم البطولة: {draft.name || '--'}</p>
            <p>النمط: {draft.format}</p>
            <p>عدد الفرق: {formatArabicNumber(validTeams.length)}</p>
            <p>موعد البداية: {draft.starts_at || '--'}</p>
            <p>شعار الراعي: {draft.sponsor_logo_url || '--'}</p>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <button className="min-h-11 rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm" onClick={prevStep}>
          السابق
        </button>
        {!isLastStep ? (
          <button className="min-h-11 rounded-2xl bg-[var(--primary-color)] px-4 py-2 text-sm font-semibold text-[#07162b]" onClick={nextStep}>
            التالي
          </button>
        ) : (
          <button
            className="min-h-11 rounded-2xl bg-[var(--primary-color)] px-4 py-2 text-sm font-semibold text-[#07162b] disabled:opacity-70"
            onClick={submit}
            disabled={loading}
          >
            {loading ? 'جار إنشاء البطولة...' : 'إنشاء البطولة'}
          </button>
        )}
      </div>
    </section>
  )
}

function Field({ value, onChange, placeholder }) {
  return (
    <input
      className="min-h-11 rounded-2xl border border-white/15 bg-black/25 px-3 py-2"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
    />
  )
}
