import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../../auth/useAuth'
import { ROLES } from '../../auth/roles'
import {
  bulkScheduleMatches,
  createTournament,
  deleteTournament,
  fetchTournamentDetails,
  fetchTournaments,
  launchTournament,
  replaceTournamentTeams,
  updateMatch,
  updateTournament,
} from '../../services/tournamentService'
import { deleteFinancialSetup, fetchFinancialSetup, fetchFinanceSummary, upsertFinancialSetup } from '../../services/financeService'
import { formatArabicDateTime } from '../../utils/format'

const TEAMS_PER_PAGE = 16
const MATCHES_PER_PAGE = 16
const MAX_TEAMS = 128
const KNOCKOUT_STAGE_OPTIONS = [
  { value: 'all', label: 'كل المراحل' },
  { value: 'final', label: 'النهائي' },
  { value: 'semi_final', label: 'نصف النهائي' },
  { value: 'quarter_final', label: 'ربع النهائي' },
  { value: 'round_of_16', label: 'دور الـ16' },
  { value: 'round_of_32', label: 'دور الـ32' },
]

function toLocalDateTime(value) {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  const tz = parsed.getTimezoneOffset()
  const local = new Date(parsed.getTime() - tz * 60000)
  return local.toISOString().slice(0, 16)
}

function toUtcIsoFromLocalDateTime(value) {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString().replace(/\.\d{3}Z$/, 'Z')
}

function compareMatchesByStartTime(a, b) {
  const aTime = Date.parse(a?.starts_at || '')
  const bTime = Date.parse(b?.starts_at || '')
  const aHas = Number.isFinite(aTime)
  const bHas = Number.isFinite(bTime)

  if (aHas && bHas && aTime !== bTime) return aTime - bTime
  if (aHas !== bHas) return aHas ? -1 : 1

  const aRound = Number(a?.round_number || 0)
  const bRound = Number(b?.round_number || 0)
  if (aRound !== bRound) return aRound - bRound

  return Number(a?.id || 0) - Number(b?.id || 0)
}

function emptyTeam() {
  return { team_name: '', club_name: '' }
}

function normalizeHeader(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
}

async function getXlsx() {
  return import('xlsx')
}

function readTeamsFromWorkbook(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.onload = async () => {
      try {
        const XLSX = await getXlsx()
        const data = reader.result
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        if (!sheetName) return resolve([])
        const sheet = workbook.Sheets[sheetName]
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })

        const parsed = rows
          .map((row) => {
            const entries = Object.entries(row).map(([k, v]) => [normalizeHeader(k), v])
            const map = Object.fromEntries(entries)
            const team_name =
              String(map.team_name || map.team || map.teamname || map['اسم_الفريق'] || map['team_name*'] || '').trim()
            const club_name =
              String(map.club_name || map.club || map.clubname || map['اسم_النادي'] || '').trim()
            if (!team_name) return null
            return { team_name, club_name }
          })
          .filter(Boolean)

        resolve(parsed)
      } catch {
        reject(new Error('Invalid Excel file'))
      }
    }
    reader.readAsArrayBuffer(file)
  })
}

async function downloadTeamsExcel(teams, fileName = 'teams.xlsx') {
  const XLSX = await getXlsx()
  const rows = teams.map((team) => ({
    team_name: team.team_name || '',
    club_name: team.club_name || '',
  }))
  const worksheet = XLSX.utils.json_to_sheet(rows.length ? rows : [{ team_name: '', club_name: '' }])
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Teams')
  XLSX.writeFile(workbook, fileName)
}

export default function ScheduleManagementPage() {
  const { role } = useAuth()
  const isAdmin = role === ROLES.ADMIN
  const importRef = useRef(null)

  const [tournaments, setTournaments] = useState([])
  const [selectedTournamentId, setSelectedTournamentId] = useState('')
  const [details, setDetails] = useState(null)
  const [createForm, setCreateForm] = useState({
    name: '',
    format: '\u062f\u0648\u0631\u064a',
    starts_at: '',
    sponsor_logo_url: '',
    home_away_enabled: false,
    home_away_stages: ['league'],
  })
  const [settings, setSettings] = useState({
    name: '',
    format: '\u062f\u0648\u0631\u064a',
    status: 'draft',
    starts_at: '',
    ends_at: '',
    sponsor_logo_url: '',
    home_away_enabled: false,
    home_away_stages: ['league'],
  })
  const [financial, setFinancial] = useState({
    entry_fee: '',
    sponsor_amount: '',
    expected_teams: '',
    hour_rate: '',
    match_duration_minutes: '',
  })
  const [financeSummary, setFinanceSummary] = useState(null)
  const [teams, setTeams] = useState([emptyTeam(), emptyTeam()])
  const [teamsPage, setTeamsPage] = useState(1)
  const [matchTimes, setMatchTimes] = useState({})
  const [matchesPage, setMatchesPage] = useState(1)
  const [selectedMatches, setSelectedMatches] = useState([])
  const [bulkSchedule, setBulkSchedule] = useState({
    date: '',
    start_time: '18:00',
    interval_minutes: 30,
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function loadTournaments() {
    const rows = await fetchTournaments()
    setTournaments(rows || [])
    if (!selectedTournamentId && rows?.[0]?.id) setSelectedTournamentId(String(rows[0].id))
  }

  async function loadDetails(tournamentId) {
    if (!tournamentId) return
    const data = await fetchTournamentDetails(Number(tournamentId))
    const financialData = await fetchFinancialSetup(Number(tournamentId)).catch(() => null)
    const financeSummaryData = await fetchFinanceSummary(Number(tournamentId)).catch(() => null)
    setDetails(data)
    setSettings({
      name: data?.name || '',
      format: data?.format || '\u062f\u0648\u0631\u064a',
      status: data?.status || 'draft',
      starts_at: toLocalDateTime(data?.starts_at),
      ends_at: toLocalDateTime(data?.ends_at),
      sponsor_logo_url: data?.sponsor_logo_url || '',
      home_away_enabled: Boolean(data?.home_away_enabled),
      home_away_stages:
        Array.isArray(data?.home_away_stages) && data.home_away_stages.length
          ? data.home_away_stages
          : data?.home_away_stage
            ? [data.home_away_stage]
            : data?.format === 'دوري'
              ? ['league']
              : [],
    })
    setFinancial({
      entry_fee: String(financialData?.entry_fee ?? ''),
      sponsor_amount: String(financialData?.sponsor_amount ?? ''),
      expected_teams: String(financialData?.expected_teams ?? ''),
      hour_rate: String(financialData?.hour_rate ?? ''),
      match_duration_minutes: String(financialData?.match_duration_minutes ?? ''),
    })
    setFinanceSummary(financeSummaryData || null)

    const nextTeams =
      (data?.teams || []).length > 0
        ? data.teams.map((team) => ({
            team_name: team.team_name || '',
            club_name: team.club_name || '',
          }))
        : [emptyTeam(), emptyTeam()]
    setTeams(nextTeams)
    setTeamsPage(1)

    const nextTimes = {}
    for (const match of data?.matches || []) nextTimes[match.id] = toLocalDateTime(match.starts_at)
    setMatchTimes(nextTimes)
    setMatchesPage(1)
    setSelectedMatches([])
  }

  useEffect(() => {
    setLoading(true)
    setError('')
    loadTournaments()
      .catch((e) => setError(e?.response?.data?.message || 'Failed to load tournaments'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedTournamentId) return
    setLoading(true)
    setError('')
    loadDetails(selectedTournamentId)
      .catch((e) => setError(e?.response?.data?.message || 'Failed to load tournament details'))
      .finally(() => setLoading(false))
  }, [selectedTournamentId])

  const teamNameById = useMemo(() => {
    const map = new Map()
    for (const team of details?.teams || []) map.set(Number(team.id), team.team_name)
    return map
  }, [details?.teams])

  const teamsPagesCount = Math.max(1, Math.ceil(teams.length / TEAMS_PER_PAGE))
  const pagedTeams = useMemo(() => {
    const start = (teamsPage - 1) * TEAMS_PER_PAGE
    return teams.slice(start, start + TEAMS_PER_PAGE)
  }, [teams, teamsPage])

  const allMatches = useMemo(() => {
    const list = (details?.matches || []).slice()
    list.sort(compareMatchesByStartTime)
    return list
  }, [details?.matches])
  const matchesPagesCount = Math.max(1, Math.ceil(allMatches.length / MATCHES_PER_PAGE))
  const pagedMatches = useMemo(() => {
    const start = (matchesPage - 1) * MATCHES_PER_PAGE
    return allMatches.slice(start, start + MATCHES_PER_PAGE)
  }, [allMatches, matchesPage])

  async function onImportTeams(file) {
    if (!file) return
    setError('')
    try {
      const imported = await readTeamsFromWorkbook(file)
      if (!imported.length) {
        setError('No valid teams found in the uploaded sheet')
        return
      }
      if (imported.length > MAX_TEAMS) {
        setError(`Maximum ${MAX_TEAMS} teams are allowed`)
        return
      }
      setTeams(imported)
      setTeamsPage(1)
    } catch (e) {
      setError(e?.message || 'Failed to import teams')
    } finally {
      if (importRef.current) importRef.current.value = ''
    }
  }

  async function createNewTournament() {
    if (!isAdmin) return
    if (!createForm.name.trim()) {
      setError('Tournament name is required')
      return
    }
    setSaving(true)
    setError('')
    try {
      const created = await createTournament({
        name: createForm.name.trim(),
        format: createForm.format,
        starts_at: createForm.starts_at || null,
        sponsor_logo_url: createForm.sponsor_logo_url.trim() || null,
        home_away_enabled: Boolean(createForm.home_away_enabled),
        home_away_stages: createForm.home_away_enabled ? createForm.home_away_stages : [],
        teams: [],
      })
      await loadTournaments()
      setSelectedTournamentId(String(created.id))
      setCreateForm({
        name: '',
        format: createForm.format,
        starts_at: '',
        sponsor_logo_url: '',
        home_away_enabled: false,
        home_away_stages: createForm.format === 'دوري' ? ['league'] : [],
      })
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to create tournament')
    } finally {
      setSaving(false)
    }
  }

  async function removeTournament() {
    if (!isAdmin || !selectedTournamentId) return
    const ok = window.confirm('Delete this tournament and all related matches/teams/financials?')
    if (!ok) return
    setSaving(true)
    setError('')
    try {
      await deleteTournament(Number(selectedTournamentId))
      const rows = await fetchTournaments()
      setTournaments(rows || [])
      setSelectedTournamentId(rows?.[0]?.id ? String(rows[0].id) : '')
      if (!rows?.length) {
        setDetails(null)
      }
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to delete tournament')
    } finally {
      setSaving(false)
    }
  }

  async function saveSettings(event) {
    event.preventDefault()
    if (!selectedTournamentId) return
    setSaving(true)
    setError('')
    try {
      await updateTournament(Number(selectedTournamentId), {
        name: settings.name.trim(),
        format: settings.format,
        status: settings.status,
        starts_at: settings.starts_at || null,
        ends_at: settings.ends_at || null,
        sponsor_logo_url: settings.sponsor_logo_url.trim() || null,
        home_away_enabled: Boolean(settings.home_away_enabled),
        home_away_stages: settings.home_away_enabled ? settings.home_away_stages : [],
      })
      await loadTournaments()
      await loadDetails(selectedTournamentId)
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to save tournament settings')
    } finally {
      setSaving(false)
    }
  }

  async function saveTeams() {
    if (!selectedTournamentId) return
    const validTeams = teams.filter((team) => team.team_name.trim())
    if (validTeams.length > MAX_TEAMS) {
      setError(`Maximum ${MAX_TEAMS} teams are allowed`)
      return
    }
    setSaving(true)
    setError('')
    try {
      await replaceTournamentTeams(Number(selectedTournamentId), validTeams)
      await loadDetails(selectedTournamentId)
      await loadTournaments()
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to save teams')
    } finally {
      setSaving(false)
    }
  }

  async function saveMatchTime(matchId) {
    if (!selectedTournamentId) return
    setSaving(true)
    setError('')
    try {
      const startsAt = toUtcIsoFromLocalDateTime(matchTimes[matchId])
      await updateMatch(Number(selectedTournamentId), Number(matchId), {
        starts_at: startsAt,
      })
      await loadDetails(selectedTournamentId)
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to update match time')
    } finally {
      setSaving(false)
    }
  }

  async function applyBulkSchedule() {
    if (!selectedTournamentId || !selectedMatches.length) return
    if (!bulkSchedule.date || !bulkSchedule.start_time) {
      setError('Please select date and start time')
      return
    }

    setSaving(true)
    setError('')
    try {
      await bulkScheduleMatches(Number(selectedTournamentId), {
        match_ids: selectedMatches,
        date: bulkSchedule.date,
        start_time: bulkSchedule.start_time,
        interval_minutes: Number(bulkSchedule.interval_minutes || 30),
        timezone_offset_minutes: new Date().getTimezoneOffset(),
      })
      await loadDetails(selectedTournamentId)
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to apply bulk schedule')
    } finally {
      setSaving(false)
    }
  }

  async function onLaunchTournament() {
    if (!selectedTournamentId) return
    setSaving(true)
    setError('')
    try {
      await launchTournament(Number(selectedTournamentId))
      await loadTournaments()
      await loadDetails(selectedTournamentId)
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to launch tournament')
    } finally {
      setSaving(false)
    }
  }

  async function saveFinancialSetup() {
    if (!isAdmin || !selectedTournamentId) return
    setSaving(true)
    setError('')
    try {
      await upsertFinancialSetup({
        tournament_id: Number(selectedTournamentId),
        entry_fee: Number(financial.entry_fee || 0),
        sponsor_amount: Number(financial.sponsor_amount || 0),
        expected_teams: Number(financial.expected_teams || 0),
        hour_rate: Number(financial.hour_rate || 0),
        match_duration_minutes: Number(financial.match_duration_minutes || 0),
      })
      const summary = await fetchFinanceSummary(Number(selectedTournamentId)).catch(() => null)
      setFinanceSummary(summary)
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to save financial setup')
    } finally {
      setSaving(false)
    }
  }

  async function clearFinancialSetup() {
    if (!isAdmin || !selectedTournamentId) return
    setSaving(true)
    setError('')
    try {
      await deleteFinancialSetup(Number(selectedTournamentId))
      setFinancial({
        entry_fee: '',
        sponsor_amount: '',
        expected_teams: '',
        hour_rate: '',
        match_duration_minutes: '',
      })
      setFinanceSummary(null)
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to clear financial setup')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-4">
      {isAdmin ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-base font-semibold">Create Tournament</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <Field value={createForm.name} onChange={(e) => setCreateForm((s) => ({ ...s, name: e.target.value }))} placeholder="Tournament name" />
            <select
              className="min-h-11 rounded-2xl border border-white/15 bg-black/25 px-3 py-2"
              value={createForm.format}
              onChange={(event) =>
                setCreateForm((s) => ({
                  ...s,
                  format: event.target.value,
                  home_away_stages: event.target.value === 'دوري' ? ['league'] : [],
                }))
              }
            >
              <option value={'\u062f\u0648\u0631\u064a'}>League</option>
              <option value={'\u062e\u0631\u0648\u062c \u0645\u063a\u0644\u0648\u0628'}>Knockout</option>
            </select>
            <input
              type="datetime-local"
              className="min-h-11 rounded-2xl border border-white/15 bg-black/25 px-3 py-2"
              value={createForm.starts_at}
              onChange={(event) => setCreateForm((s) => ({ ...s, starts_at: event.target.value }))}
            />
            <Field
              value={createForm.sponsor_logo_url}
              onChange={(e) => setCreateForm((s) => ({ ...s, sponsor_logo_url: e.target.value }))}
              placeholder="Sponsor logo URL"
            />
            <label className="flex min-h-11 items-center gap-2 rounded-2xl border border-white/15 bg-black/25 px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={createForm.home_away_enabled}
                onChange={(event) =>
                  setCreateForm((s) => ({
                    ...s,
                    home_away_enabled: event.target.checked,
                    home_away_stages: s.format === 'دوري' ? ['league'] : s.home_away_stages || [],
                  }))
                }
              />
              ذهاب وإياب
            </label>
            {createForm.format === 'دوري' ? (
              <p className="min-h-11 rounded-2xl border border-white/15 bg-black/25 px-3 py-2 text-sm text-[var(--text-secondary)]">مرحلة الدوري</p>
            ) : (
              <div className="grid gap-2 md:col-span-2">
                {KNOCKOUT_STAGE_OPTIONS.map((option) => {
                  const checked = createForm.home_away_stages.includes(option.value)
                  return (
                    <label key={option.value} className="flex min-h-10 items-center gap-2 rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!createForm.home_away_enabled}
                        onChange={(event) =>
                          setCreateForm((s) => {
                            const next = new Set(s.home_away_stages || [])
                            if (event.target.checked) next.add(option.value)
                            else next.delete(option.value)
                            return { ...s, home_away_stages: [...next] }
                          })
                        }
                      />
                      {option.label}
                    </label>
                  )
                })}
              </div>
            )}
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={createNewTournament}
            className="mt-3 min-h-11 rounded-2xl bg-[var(--primary-color)] px-4 py-2 text-sm font-semibold text-[#07162b] disabled:opacity-60"
          >
            Create Tournament
          </button>
        </div>
      ) : null}

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Tournament Workspace</h2>
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="min-h-11 rounded-2xl border border-white/15 bg-black/25 px-3 py-2"
              value={selectedTournamentId}
              onChange={(event) => setSelectedTournamentId(event.target.value)}
            >
              {tournaments.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} - {translateStatus(item.status)}
                </option>
              ))}
            </select>
            {isAdmin ? (
              <button
                type="button"
                disabled={saving || !selectedTournamentId}
                onClick={removeTournament}
                className="min-h-11 rounded-2xl border border-rose-300/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-200 disabled:opacity-60"
              >
                Delete Tournament
              </button>
            ) : null}
          </div>
        </div>
        {details ? (
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Status: <span className="text-[var(--text-primary)]">{translateStatus(details.status)}</span>
          </p>
        ) : null}
      </div>

      {error ? <p className="rounded-xl border border-rose-300/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p> : null}
      {loading ? <p className="text-sm text-[var(--text-secondary)]">Loading...</p> : null}

      {details && isAdmin ? (
        <>
          <form className="rounded-2xl border border-white/10 bg-white/5 p-4" onSubmit={saveSettings}>
            <p className="text-base font-semibold">Core Settings</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <Field value={settings.name} onChange={(e) => setSettings((s) => ({ ...s, name: e.target.value }))} placeholder="Tournament name" />
              <select
                className="min-h-11 rounded-2xl border border-white/15 bg-black/25 px-3 py-2"
                value={settings.format}
                onChange={(event) =>
                  setSettings((s) => ({
                    ...s,
                    format: event.target.value,
                    home_away_stages: event.target.value === 'دوري' ? ['league'] : [],
                  }))
                }
              >
                <option value={'\u062f\u0648\u0631\u064a'}>League</option>
                <option value={'\u062e\u0631\u0648\u062c \u0645\u063a\u0644\u0648\u0628'}>Knockout</option>
              </select>
              <select
                className="min-h-11 rounded-2xl border border-white/15 bg-black/25 px-3 py-2"
                value={settings.status}
                onChange={(event) => setSettings((s) => ({ ...s, status: event.target.value }))}
              >
                <option value="draft">Draft</option>
                <option value="scheduled">Scheduled</option>
                <option value="live">Live</option>
                <option value="finished">Finished</option>
              </select>
              <input
                type="datetime-local"
                className="min-h-11 rounded-2xl border border-white/15 bg-black/25 px-3 py-2"
                value={settings.starts_at}
                onChange={(event) => setSettings((s) => ({ ...s, starts_at: event.target.value }))}
              />
              <input
                type="datetime-local"
                className="min-h-11 rounded-2xl border border-white/15 bg-black/25 px-3 py-2"
                value={settings.ends_at}
                onChange={(event) => setSettings((s) => ({ ...s, ends_at: event.target.value }))}
              />
              <Field
                value={settings.sponsor_logo_url}
                onChange={(e) => setSettings((s) => ({ ...s, sponsor_logo_url: e.target.value }))}
                placeholder="Sponsor logo URL"
                className="md:col-span-2"
              />
              <label className="flex min-h-11 items-center gap-2 rounded-2xl border border-white/15 bg-black/25 px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={settings.home_away_enabled}
                  onChange={(event) =>
                    setSettings((s) => ({
                      ...s,
                      home_away_enabled: event.target.checked,
                      home_away_stages: s.format === 'دوري' ? ['league'] : s.home_away_stages || [],
                    }))
                  }
                />
                ذهاب وإياب
              </label>
              {settings.format === 'دوري' ? (
                <p className="min-h-11 rounded-2xl border border-white/15 bg-black/25 px-3 py-2 text-sm text-[var(--text-secondary)]">مرحلة الدوري</p>
              ) : (
                <div className="grid gap-2 md:col-span-2">
                  {KNOCKOUT_STAGE_OPTIONS.map((option) => {
                    const checked = settings.home_away_stages.includes(option.value)
                    return (
                      <label key={option.value} className="flex min-h-10 items-center gap-2 rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-sm">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!settings.home_away_enabled}
                          onChange={(event) =>
                            setSettings((s) => {
                              const next = new Set(s.home_away_stages || [])
                              if (event.target.checked) next.add(option.value)
                              else next.delete(option.value)
                              return { ...s, home_away_stages: [...next] }
                            })
                          }
                        />
                        {option.label}
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={saving}
                className="min-h-11 rounded-2xl bg-[var(--primary-color)] px-4 py-2 text-sm font-semibold text-[#07162b] disabled:opacity-60"
              >
                Save Settings
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={onLaunchTournament}
                className="min-h-11 rounded-2xl border border-emerald-300/40 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200 disabled:opacity-60"
              >
                Launch Tournament
              </button>
            </div>
          </form>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-base font-semibold">Financial Setup</p>
            <div className="mt-3 grid gap-3 md:grid-cols-5">
              <Field
                value={financial.entry_fee}
                onChange={(e) => setFinancial((s) => ({ ...s, entry_fee: e.target.value }))}
                placeholder="Entry fee"
              />
              <Field
                value={financial.sponsor_amount}
                onChange={(e) => setFinancial((s) => ({ ...s, sponsor_amount: e.target.value }))}
                placeholder="Sponsor amount"
              />
              <Field
                value={financial.expected_teams}
                onChange={(e) => setFinancial((s) => ({ ...s, expected_teams: e.target.value }))}
                placeholder="Expected teams"
              />
              <Field
                value={financial.hour_rate}
                onChange={(e) => setFinancial((s) => ({ ...s, hour_rate: e.target.value }))}
                placeholder="Hour rate (EGP)"
              />
              <Field
                value={financial.match_duration_minutes}
                onChange={(e) => setFinancial((s) => ({ ...s, match_duration_minutes: e.target.value }))}
                placeholder="Match duration (min)"
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={saveFinancialSetup}
                className="min-h-11 rounded-2xl bg-[var(--primary-color)] px-4 py-2 text-sm font-semibold text-[#07162b] disabled:opacity-60"
              >
                Save Financial Setup
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={clearFinancialSetup}
                className="min-h-11 rounded-2xl border border-rose-300/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-200 disabled:opacity-60"
              >
                Delete Financial Setup
              </button>
            </div>
            {financeSummary ? (
              <div className="mt-3 grid gap-2 text-xs text-[var(--text-secondary)] md:grid-cols-8">
                <Stat label="Revenue" value={financeSummary.total_revenue} />
                <Stat label="Costs" value={financeSummary.total_costs} />
                <Stat label="Operating Costs" value={financeSummary.operating_costs} />
                <Stat label="Manual Costs" value={financeSummary.manual_costs} />
                <Stat label="Net" value={financeSummary.net_profit} />
                <Stat label="Margin %" value={financeSummary.profit_margin} />
                <Stat label="Break-even Teams" value={financeSummary.break_even_teams} />
                <Stat label="Total Matches" value={financeSummary.total_matches} />
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-base font-semibold">Teams</p>
              <div className="flex flex-wrap gap-2">
                <input
                  ref={importRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(event) => onImportTeams(event.target.files?.[0])}
                />
                <button type="button" onClick={() => importRef.current?.click()} className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs">
                  Import Excel
                </button>
                <button
                  type="button"
                  onClick={() => void downloadTeamsExcel([], 'teams_template.xlsx')}
                  className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs"
                >
                  Download Template
                </button>
                <button
                  type="button"
                  onClick={() => void downloadTeamsExcel(teams, 'teams_export.xlsx')}
                  className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs"
                >
                  Export Excel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTeams((state) => {
                      const next = [...state, emptyTeam()]
                      setTeamsPage(Math.max(1, Math.ceil(next.length / TEAMS_PER_PAGE)))
                      return next
                    })
                  }}
                  className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs"
                >
                  Add Team
                </button>
              </div>
            </div>

            <p className="mt-2 text-xs text-[var(--text-secondary)]">
              {teams.length} teams loaded. Designed for up to {MAX_TEAMS} teams.
            </p>

            <div className="mt-3 space-y-2">
              {pagedTeams.map((team, localIndex) => {
                const index = (teamsPage - 1) * TEAMS_PER_PAGE + localIndex
                return (
                  <div key={index} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                    <Field
                      value={team.team_name}
                      onChange={(e) => setTeams((state) => state.map((t, i) => (i === index ? { ...t, team_name: e.target.value } : t)))}
                      placeholder="Team name"
                    />
                    <Field
                      value={team.club_name}
                      onChange={(e) => setTeams((state) => state.map((t, i) => (i === index ? { ...t, club_name: e.target.value } : t)))}
                      placeholder="Club name"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setTeams((state) => {
                          const next = state.filter((_, i) => i !== index)
                          const safeNext = next.length ? next : [emptyTeam(), emptyTeam()]
                          const nextPages = Math.max(1, Math.ceil(safeNext.length / TEAMS_PER_PAGE))
                          setTeamsPage((p) => Math.min(p, nextPages))
                          return safeNext
                        })
                      }
                      className="rounded-xl border border-rose-300/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200"
                    >
                      Remove
                    </button>
                  </div>
                )
              })}
            </div>

            <Pager page={teamsPage} pagesCount={teamsPagesCount} onChange={setTeamsPage} />

            <button
              type="button"
              disabled={saving}
              onClick={saveTeams}
              className="mt-3 min-h-11 rounded-2xl bg-[var(--primary-color)] px-4 py-2 text-sm font-semibold text-[#07162b] disabled:opacity-60"
            >
              Save Teams
            </button>
          </div>
        </>
      ) : null}

      {details ? (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
          {isAdmin ? (
            <div className="border-b border-white/10 p-4">
              <p className="text-sm font-semibold">Schedule Selected Matches</p>
              <div className="mt-2 grid gap-2 md:grid-cols-[1fr_1fr_1fr_auto]">
                <input
                  type="date"
                  className="min-h-10 rounded-xl border border-white/15 bg-black/25 px-3 py-2"
                  value={bulkSchedule.date}
                  onChange={(event) => setBulkSchedule((s) => ({ ...s, date: event.target.value }))}
                />
                <input
                  type="time"
                  className="min-h-10 rounded-xl border border-white/15 bg-black/25 px-3 py-2"
                  value={bulkSchedule.start_time}
                  onChange={(event) => setBulkSchedule((s) => ({ ...s, start_time: event.target.value }))}
                />
                <input
                  type="number"
                  min={0}
                  className="min-h-10 rounded-xl border border-white/15 bg-black/25 px-3 py-2"
                  value={bulkSchedule.interval_minutes}
                  onChange={(event) => setBulkSchedule((s) => ({ ...s, interval_minutes: event.target.value }))}
                  placeholder="Interval minutes"
                />
                <button
                  type="button"
                  disabled={saving || selectedMatches.length === 0}
                  onClick={applyBulkSchedule}
                  className="rounded-xl bg-[var(--primary-color)] px-3 py-2 text-xs font-semibold text-[#07162b] disabled:opacity-60"
                >
                  Apply to {selectedMatches.length} matches
                </button>
              </div>
            </div>
          ) : null}
          <table className="min-w-full text-right text-sm">
            <thead className="bg-white/5 text-[var(--text-secondary)]">
              <tr>
                {isAdmin ? <th className="px-4 py-3">Select</th> : null}
                <th className="px-4 py-3">المرحلة</th>
                <th className="px-4 py-3">Match</th>
                <th className="px-4 py-3">Start time</th>
                {isAdmin ? <th className="px-4 py-3">Action</th> : null}
              </tr>
            </thead>
            <tbody>
              {allMatches.length ? (
                pagedMatches.map((match) => (
                  <tr key={match.id} className="border-t border-white/10">
                    {isAdmin ? (
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedMatches.includes(match.id)}
                          onChange={(event) =>
                            setSelectedMatches((state) =>
                              event.target.checked ? [...state, match.id] : state.filter((id) => id !== match.id),
                            )
                          }
                        />
                      </td>
                    ) : null}
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{formatStageName(match)}</td>
                    <td className="px-4 py-3">
                      {(teamNameById.get(Number(match.home_team_id)) || '---') + ' vs ' + (teamNameById.get(Number(match.away_team_id)) || '---')}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">
                      {isAdmin ? (
                        <input
                          type="datetime-local"
                          className="min-h-10 rounded-xl border border-white/15 bg-black/25 px-3 py-2"
                          value={matchTimes[match.id] || ''}
                          onChange={(event) => setMatchTimes((state) => ({ ...state, [match.id]: event.target.value }))}
                        />
                      ) : (
                        formatArabicDateTime(match.starts_at)
                      )}
                    </td>
                    {isAdmin ? (
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => saveMatchTime(match.id)}
                          className="rounded-xl bg-[var(--primary-color)] px-3 py-2 text-xs font-semibold text-[#07162b] disabled:opacity-60"
                        >
                          Save
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-8 text-center text-[var(--text-secondary)]" colSpan={isAdmin ? 5 : 3}>
                    No matches yet. Save teams first to generate fixtures.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="border-t border-white/10 px-4 py-3">
            <p className="mb-2 text-xs text-[var(--text-secondary)]">Total matches: {allMatches.length}. Optimized for 64+ matches.</p>
            <Pager page={matchesPage} pagesCount={matchesPagesCount} onChange={setMatchesPage} />
          </div>
        </div>
      ) : null}
    </section>
  )
}

function Field({ value, onChange, placeholder, className = '' }) {
  return (
    <input
      className={`min-h-11 rounded-2xl border border-white/15 bg-black/25 px-3 py-2 ${className}`.trim()}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
    />
  )
}

function Pager({ page, pagesCount, onChange }) {
  if (pagesCount <= 1) return null
  return (
    <div className="mt-3 flex items-center justify-end gap-2">
      <button type="button" onClick={() => onChange(Math.max(1, page - 1))} className="rounded-xl border border-white/15 bg-white/5 px-3 py-1 text-xs">
        Prev
      </button>
      <span className="text-xs text-[var(--text-secondary)]">
        Page {page} of {pagesCount}
      </span>
      <button type="button" onClick={() => onChange(Math.min(pagesCount, page + 1))} className="rounded-xl border border-white/15 bg-white/5 px-3 py-1 text-xs">
        Next
      </button>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-sm text-[var(--text-primary)]">{value ?? '--'}</p>
    </div>
  )
}

function translateStatus(status) {
  if (status === 'draft') return 'Draft'
  if (status === 'scheduled') return 'Scheduled'
  if (status === 'live') return 'Live'
  if (status === 'finished') return 'Finished'
  return 'Unknown'
}

function formatStageName(match) {
  const base = String(match?.stage_name || '').trim()
  const leg = Number(match?.leg_number || 1)
  if (!base) return '--'
  if (leg === 2) return `${base} - إياب`
  return `${base} - ذهاب`
}

