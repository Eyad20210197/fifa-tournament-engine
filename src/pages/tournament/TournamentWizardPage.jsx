import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createTournament } from '../../services/tournamentService'
import { upsertFinancialSetup } from '../../services/financeService'

const steps = ['????????? ????????', '???????', '?????', '???????', '????????']

function emptyTeam() {
  return {
    team_name: '',
    club_name: '',
    player1: '',
    player2: '',
    logo: '',
  }
}

export default function TournamentWizardPage() {
  const navigate = useNavigate()
  const [stepIndex, setStepIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [draft, setDraft] = useState({
    name: '',
    format: '????',
    starts_at: '',
    teams: [emptyTeam(), emptyTeam()],
    financial: {
      entry_fee: '',
      sponsor_amount: '',
      expected_teams: '',
    },
  })

  const isLastStep = useMemo(() => stepIndex === steps.length - 1, [stepIndex])

  function validateStep(index = stepIndex) {
    if (index === 0) {
      if (!draft.name.trim()) return '??? ??????? ?????'
      if (!draft.format) return '??? ??????? ?????'
    }

    if (index === 2) {
      const validTeams = draft.teams.filter((team) => team.team_name.trim())
      if (validTeams.length < 2) return '???? ?????? ??? ?????'
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
    setError('')
    setLoading(true)

    try {
      const tournament = await createTournament({
        name: draft.name || '????? ?????',
        format: draft.format,
        starts_at: draft.starts_at || null,
        teams: draft.teams.filter((team) => team.team_name.trim()),
      })

      if (draft.financial.expected_teams || draft.financial.entry_fee || draft.financial.sponsor_amount) {
        await upsertFinancialSetup({
          tournament_id: tournament.id,
          entry_fee: Number(draft.financial.entry_fee || 0),
          sponsor_amount: Number(draft.financial.sponsor_amount || 0),
          expected_teams: Number(draft.financial.expected_teams || 0),
        })
      }

      navigate('/saas/tournaments', { replace: true })
    } catch (requestError) {
      setError(requestError?.response?.data?.message || '??? ??? ???????')
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
        teams: draft.teams.filter((team) => team.team_name.trim()),
      })

      await upsertFinancialSetup({
        tournament_id: tournament.id,
        entry_fee: Number(draft.financial.entry_fee || 0),
        sponsor_amount: Number(draft.financial.sponsor_amount || 0),
        expected_teams: Number(draft.financial.expected_teams || 0),
      })

      navigate('/saas/tournaments', { replace: true })
    } catch (requestError) {
      setError(requestError?.response?.data?.message || '??? ????? ???????')
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">????? ????? ?????</h1>
        <button
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm disabled:opacity-60"
          onClick={saveAsDraft}
          disabled={loading}
        >
          ??? ??????
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {steps.map((label, index) => (
          <div
            key={label}
            className={[
              'rounded-xl border px-3 py-2 text-xs',
              index === stepIndex ? 'border-[#c9a227]/60 bg-[#c9a227]/10 text-[#f6d365]' : 'border-white/10 bg-white/5',
            ].join(' ')}
          >
            {index + 1}. {label}
          </div>
        ))}
      </div>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="mb-3 text-sm text-white/70">?????? ???????: {steps[stepIndex]}</p>

        {stepIndex === 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              className="rounded-xl border border-white/10 bg-black/30 px-3 py-2"
              placeholder="??? ???????"
              value={draft.name}
              onChange={(event) => setDraft((state) => ({ ...state, name: event.target.value }))}
            />
            <select
              className="rounded-xl border border-white/10 bg-black/30 px-3 py-2"
              value={draft.format}
              onChange={(event) => setDraft((state) => ({ ...state, format: event.target.value }))}
            >
              <option value="????">????</option>
              <option value="???? ?????">???? ?????</option>
            </select>
            <input
              type="datetime-local"
              className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 sm:col-span-2"
              value={draft.starts_at}
              onChange={(event) => setDraft((state) => ({ ...state, starts_at: event.target.value }))}
            />
          </div>
        ) : null}

        {stepIndex === 1 ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <input
              className="rounded-xl border border-white/10 bg-black/30 px-3 py-2"
              placeholder="???? ????????"
              value={draft.financial.entry_fee}
              onChange={(event) =>
                setDraft((state) => ({
                  ...state,
                  financial: { ...state.financial, entry_fee: event.target.value },
                }))
              }
            />
            <input
              className="rounded-xl border border-white/10 bg-black/30 px-3 py-2"
              placeholder="???? ??????"
              value={draft.financial.sponsor_amount}
              onChange={(event) =>
                setDraft((state) => ({
                  ...state,
                  financial: { ...state.financial, sponsor_amount: event.target.value },
                }))
              }
            />
            <input
              className="rounded-xl border border-white/10 bg-black/30 px-3 py-2"
              placeholder="??? ????? ???????"
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
                <input
                  className="rounded-xl border border-white/10 bg-black/30 px-3 py-2"
                  placeholder={`??? ?????? ${index + 1}`}
                  value={team.team_name}
                  onChange={(event) => updateTeam(index, { team_name: event.target.value })}
                />
                <input
                  className="rounded-xl border border-white/10 bg-black/30 px-3 py-2"
                  placeholder="??? ??????"
                  value={team.club_name}
                  onChange={(event) => updateTeam(index, { club_name: event.target.value })}
                />
              </div>
            ))}
            <button className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm" onClick={addTeam}>
              ????? ????
            </button>
          </div>
        ) : null}

        {stepIndex === 3 ? <p className="text-sm text-white/75">???? ????? ??????? ?? ?????? ??? ??? ???????.</p> : null}

        {stepIndex === 4 ? (
          <div className="space-y-2 text-sm text-white/80">
            <p>?????: {draft.name || '--'}</p>
            <p>?????: {draft.format}</p>
            <p>??? ?????: {draft.teams.filter((team) => team.team_name.trim()).length}</p>
            <p>???? ???????: {draft.starts_at || '--'}</p>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <button className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm" onClick={prevStep}>
          ??????
        </button>
        {!isLastStep ? (
          <button className="rounded-xl bg-[#c9a227] px-4 py-2 text-sm font-semibold text-[#07162b]" onClick={nextStep}>
            ??????
          </button>
        ) : (
          <button
            className="rounded-xl bg-[#c9a227] px-4 py-2 text-sm font-semibold text-[#07162b] disabled:opacity-70"
            onClick={submit}
            disabled={loading}
          >
            {loading ? '???? ?????...' : '????? ???????'}
          </button>
        )}
      </div>
    </div>
  )
}
