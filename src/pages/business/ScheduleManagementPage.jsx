import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../../auth/useAuth'
import { useLanguage } from '../../i18n/LanguageContext'
import { ROLES } from '../../auth/roles'
import {
  bulkScheduleMatches,
  createTournament,
  deleteTournament,
  fetchTournamentProgress,
  fetchTournamentDetails,
  fetchTournaments,
  generateTournamentNextRound,
  importTournamentCustomSchedule,
  launchTournament,
  replaceTournamentTeams,
  setTournamentProgressionLock,
  updateMatch,
  updateTournament,
} from '../../services/tournamentService'
import { deleteFinancialSetup, fetchFinancialSetup, fetchFinanceSummary, upsertFinancialSetup } from '../../services/financeService'
import {
  downloadCustomTournamentTemplate,
  readCustomTournamentWorkbook,
} from '../../utils/tournament/workbookImport'
import { publishTournamentDetailsToLiveState } from '../../utils/tournament/liveSnapshot'
import AppIcon from '../../components/common/AppIcon'
import ShinyText from '../../components/reactbits/ShinyText'
import SpotlightCard from '../../components/reactbits/SpotlightCard'

const TEAMS_PER_PAGE = 16
const MATCHES_PER_PAGE = 16
const MAX_TEAMS = 128

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

export default function ScheduleManagementPage() {
  const { role } = useAuth()
  const { t, language, isRtl } = useLanguage()
  const isAdmin = role === ROLES.ADMIN

  const knockoutStageOptions = useMemo(
    () => [
      { value: 'all', label: language === 'ar' ? 'كل المراحل' : 'All Knockout Stages' },
      { value: 'final', label: language === 'ar' ? 'النهائي' : 'Final' },
      { value: 'semi_final', label: language === 'ar' ? 'نصف النهائي' : 'Semi-Finals' },
      { value: 'quarter_final', label: language === 'ar' ? 'ربع النهائي' : 'Quarter-Finals' },
      { value: 'round_of_16', label: language === 'ar' ? 'دور الـ16' : 'Round of 16' },
      { value: 'round_of_32', label: language === 'ar' ? 'دور الـ32' : 'Round of 32' },
    ],
    [language],
  )

  const [activeTab, setActiveTab] = useState('settings') // 'settings' | 'teams' | 'fixtures' | 'progression' | 'finance' | 'create'
  const [tournaments, setTournaments] = useState([])
  const [selectedTournamentId, setSelectedTournamentId] = useState('')
  const [details, setDetails] = useState(null)
  const [progress, setProgress] = useState(null)
  const [financeSummary, setFinanceSummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const [createForm, setCreateForm] = useState({
    name: '',
    format: 'دوري',
    progression_format: 'round_robin',
    starts_at: '',
    ends_at: '',
    sponsor_logo_url: '',
    home_away_enabled: false,
    home_away_stages: ['league'],
    hybrid_qualifiers_count: 4,
  })

  const [settings, setSettings] = useState({
    name: '',
    format: 'دوري',
    progression_format: 'round_robin',
    status: 'draft',
    starts_at: '',
    ends_at: '',
    sponsor_logo_url: '',
    home_away_enabled: false,
    home_away_stages: [],
    hybrid_qualifiers_count: 4,
  })

  const [financial, setFinancial] = useState({
    entry_fee: '',
    sponsor_amount: '',
    expected_teams: '',
    hour_rate: '',
    match_duration_minutes: '',
  })

  const [teams, setTeams] = useState([])
  const [teamsPage, setTeamsPage] = useState(1)
  const [matchesPage, setMatchesPage] = useState(1)
  const [matchTimes, setMatchTimes] = useState({})
  const [selectedMatches, setSelectedMatches] = useState([])
  const [matchStageFilter, setMatchStageFilter] = useState('all')

  const [bulkConfig, setBulkConfig] = useState({
    first_match_starts_at: '',
    interval_minutes: 15,
    selected_rounds: [],
    filter_stage: 'all',
  })

  const teamsImportRef = useRef(null)
  const scheduleWorkbookRef = useRef(null)

  function showSuccess(msg) {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(''), 4000)
  }

  async function loadTournaments() {
    const list = await fetchTournaments()
    setTournaments(list || [])
    if (list?.length && !selectedTournamentId) {
      setSelectedTournamentId(String(list[0].id))
    }
  }

  async function loadDetails(id) {
    if (!id) return
    const [data, financialData, financeSummaryData, progressData] = await Promise.all([
      fetchTournamentDetails(Number(id)),
      fetchFinancialSetup(Number(id)).catch(() => null),
      fetchFinanceSummary(Number(id)).catch(() => null),
      fetchTournamentProgress(Number(id)).catch(() => null),
    ])

    setDetails(data)
    setSettings({
      name: data?.name || '',
      format: data?.format || 'دوري',
      progression_format: data?.progression_format || (data?.format === 'خروج مغلوب' ? 'knockout' : 'round_robin'),
      status: data?.status || 'draft',
      starts_at: toLocalDateTime(data?.starts_at),
      ends_at: toLocalDateTime(data?.ends_at),
      sponsor_logo_url: data?.sponsor_logo_url || '',
      home_away_enabled: Boolean(data?.home_away_enabled),
      home_away_stages: Array.isArray(data?.home_away_stages) ? data.home_away_stages : [],
      hybrid_qualifiers_count: data?.hybrid_qualifiers_count || 4,
    })

    setFinancial({
      entry_fee: String(financialData?.entry_fee ?? ''),
      sponsor_amount: String(financialData?.sponsor_amount ?? ''),
      expected_teams: String(financialData?.expected_teams ?? ''),
      hour_rate: String(financialData?.hour_rate ?? ''),
      match_duration_minutes: String(financialData?.match_duration_minutes ?? ''),
    })

    setFinanceSummary(financeSummaryData || null)
    setProgress(progressData || null)

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

    await publishTournamentDetailsToLiveState(data)
  }

  useEffect(() => {
    setLoading(true)
    loadTournaments()
      .catch((e) => setError(e?.response?.data?.message || 'Failed to load tournaments'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedTournamentId) return
    setLoading(true)
    setError('')
    loadDetails(selectedTournamentId)
      .catch((e) => setError(e?.response?.data?.message || 'Failed to load details'))
      .finally(() => setLoading(false))
  }, [selectedTournamentId])

  const teamNameById = useMemo(() => {
    const map = new Map()
    for (const team of details?.teams || []) map.set(Number(team.id), team.team_name)
    return map
  }, [details?.teams])

  const allMatches = useMemo(() => {
    const list = (details?.matches || []).slice()
    list.sort(compareMatchesByStartTime)
    if (matchStageFilter !== 'all') {
      return list.filter((m) => String(m.stage_name || '').toLowerCase() === matchStageFilter.toLowerCase())
    }
    return list
  }, [details?.matches, matchStageFilter])

  const matchesPagesCount = Math.max(1, Math.ceil(allMatches.length / MATCHES_PER_PAGE))
  const pagedMatches = useMemo(() => {
    const start = (matchesPage - 1) * MATCHES_PER_PAGE
    return allMatches.slice(start, start + MATCHES_PER_PAGE)
  }, [allMatches, matchesPage])

  const teamsPagesCount = Math.max(1, Math.ceil(teams.length / TEAMS_PER_PAGE))
  const pagedTeams = useMemo(() => {
    const start = (teamsPage - 1) * TEAMS_PER_PAGE
    return teams.slice(start, start + TEAMS_PER_PAGE)
  }, [teams, teamsPage])

  // Actions
  async function handleCreateTournament() {
    if (!createForm.name.trim()) {
      setError(language === 'ar' ? 'يرجى إدخال اسم البطولة' : 'Please enter tournament name')
      return
    }
    setSaving(true)
    setError('')
    try {
      const created = await createTournament({
        name: createForm.name.trim(),
        format: createForm.format,
        progression_format: createForm.progression_format,
        starts_at: toUtcIsoFromLocalDateTime(createForm.starts_at),
        ends_at: toUtcIsoFromLocalDateTime(createForm.ends_at),
        sponsor_logo_url: createForm.sponsor_logo_url || null,
        teams: [
          { team_name: language === 'ar' ? 'فريق 1' : 'Team 1', club_name: 'Real Madrid' },
          { team_name: language === 'ar' ? 'فريق 2' : 'Team 2', club_name: 'FC Barcelona' },
        ],
      })
      await loadTournaments()
      setSelectedTournamentId(String(created.id))
      setActiveTab('settings')
      showSuccess(language === 'ar' ? 'تم إنشاء البطولة بنجاح!' : 'Tournament created successfully!')
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to create tournament')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveSettings(e) {
    e?.preventDefault?.()
    if (!selectedTournamentId) return
    setSaving(true)
    setError('')
    try {
      const updated = await updateTournament(Number(selectedTournamentId), {
        name: settings.name.trim(),
        format: settings.format,
        progression_format: settings.progression_format,
        status: settings.status,
        starts_at: toUtcIsoFromLocalDateTime(settings.starts_at),
        ends_at: toUtcIsoFromLocalDateTime(settings.ends_at),
        sponsor_logo_url: settings.sponsor_logo_url || null,
        home_away_enabled: settings.home_away_enabled,
        home_away_stages: settings.home_away_stages,
        hybrid_qualifiers_count: settings.hybrid_qualifiers_count,
      })
      setDetails(updated)
      showSuccess(language === 'ar' ? 'تم حفظ الإعدادات بنجاح!' : 'Settings updated successfully!')
      await loadTournaments()
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update tournament')
    } finally {
      setSaving(false)
    }
  }

  async function handleLaunchTournament() {
    if (!selectedTournamentId) return
    setSaving(true)
    setError('')
    try {
      const launched = await launchTournament(Number(selectedTournamentId))
      setDetails(launched)
      setSettings((s) => ({ ...s, status: launched.status }))
      showSuccess(language === 'ar' ? 'تم إطلاق البطولة وبدء جدول المباريات!' : 'Tournament launched into LIVE mode!')
      await loadTournaments()
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to launch tournament')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteTournament() {
    if (!selectedTournamentId) return
    const ok = window.confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذه البطولة وجميع بياناتها؟' : 'Are you sure you want to delete this tournament?')
    if (!ok) return
    setSaving(true)
    setError('')
    try {
      await deleteTournament(Number(selectedTournamentId))
      showSuccess(language === 'ar' ? 'تم حذف البطولة' : 'Tournament deleted')
      setSelectedTournamentId('')
      setDetails(null)
      await loadTournaments()
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to delete tournament')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveTeams() {
    if (!selectedTournamentId) return
    const valid = teams.filter((t) => t.team_name.trim())
    if (valid.length < 2) {
      setError(language === 'ar' ? 'يجب إدخال فريقين على الأقل' : 'At least 2 teams required')
      return
    }
    setSaving(true)
    setError('')
    try {
      const updated = await replaceTournamentTeams(Number(selectedTournamentId), valid)
      setDetails(updated)
      showSuccess(language === 'ar' ? 'تم حفظ وتحديث الفرق وإعادة توليد المباريات!' : 'Teams updated and matches regenerated!')
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to replace teams')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveSingleMatch(matchId) {
    if (!selectedTournamentId) return
    const timeValue = matchTimes[matchId]
    setSaving(true)
    setError('')
    try {
      const updated = await updateMatch(Number(selectedTournamentId), Number(matchId), {
        starts_at: toUtcIsoFromLocalDateTime(timeValue),
      })
      setDetails((prev) => ({
        ...prev,
        matches: (prev?.matches || []).map((m) => (m.id === updated.id ? updated : m)),
      }))
      showSuccess(language === 'ar' ? 'تم تحديث موعد المباراة' : 'Match time updated')
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to update match')
    } finally {
      setSaving(false)
    }
  }

  async function handleBulkSchedule() {
    if (!selectedTournamentId) return
    if (!bulkConfig.first_match_starts_at) {
      setError(language === 'ar' ? 'يرجى تحديد موعد انطلاق أول مباراة' : 'Please select first match start time')
      return
    }
    setSaving(true)
    setError('')
    try {
      const updated = await bulkScheduleMatches(Number(selectedTournamentId), {
        first_match_starts_at: toUtcIsoFromLocalDateTime(bulkConfig.first_match_starts_at),
        interval_minutes: Number(bulkConfig.interval_minutes) || 15,
        match_ids: selectedMatches.length ? selectedMatches : [],
      })
      setDetails(updated)
      const nextTimes = {}
      for (const match of updated?.matches || []) nextTimes[match.id] = toLocalDateTime(match.starts_at)
      setMatchTimes(nextTimes)
      setSelectedMatches([])
      showSuccess(language === 'ar' ? 'تم تطبيق الجدولة الجماعية للمباريات بنجاح!' : 'Bulk schedule applied successfully!')
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to bulk schedule')
    } finally {
      setSaving(false)
    }
  }

  async function handleGenerateNextRound() {
    if (!selectedTournamentId) return
    setSaving(true)
    setError('')
    try {
      const updated = await generateTournamentNextRound(Number(selectedTournamentId))
      setDetails(updated)
      const p = await fetchTournamentProgress(Number(selectedTournamentId)).catch(() => null)
      setProgress(p)
      showSuccess(language === 'ar' ? 'تم توليد مواجهات الدور التالي بنجاح!' : 'Next round generated!')
    } catch (e) {
      const status = e?.response?.status
      const msg = e?.response?.data?.message || e?.message || ''
      if (status === 409 || msg.includes('not complete')) {
        setError(
          language === 'ar'
            ? 'لا يمكن توليد الدور التالي قبل اكتمال نتائج جميع مباريات الدور الحالي أولاً.'
            : 'Cannot generate next round until all matches in the current round are completed.'
        )
      } else {
        setError(msg || 'Failed to generate next round')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleProgressionLock() {
    if (!selectedTournamentId) return
    setSaving(true)
    setError('')
    try {
      const res = await setTournamentProgressionLock(Number(selectedTournamentId), !progress?.progressionLocked)
      setProgress((prev) => ({ ...prev, progressionLocked: res?.progression_locked ?? !prev?.progressionLocked }))
      showSuccess(language === 'ar' ? 'تم تعديل قفل التقدم' : 'Progression lock toggled')
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to toggle lock')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveFinancial() {
    if (!selectedTournamentId) return
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
      showSuccess(language === 'ar' ? 'تم حفظ الإعدادات المالية' : 'Financial setup saved')
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to save financial setup')
    } finally {
      setSaving(false)
    }
  }

  const tabs = [
    { id: 'settings', label: language === 'ar' ? 'الإعدادات والنمط' : 'Settings & Rules', icon: 'sliders' },
    { id: 'teams', label: language === 'ar' ? 'الفرق واللاعبين' : 'Teams & Roster', icon: 'users' },
    { id: 'fixtures', label: language === 'ar' ? 'الجدول والمواعيد' : 'Fixtures & Schedule', icon: 'calendar' },
    { id: 'progression', label: language === 'ar' ? 'التقدم والأدوار' : 'Progression', icon: 'trophy' },
    { id: 'finance', label: language === 'ar' ? 'المالية والجوائز' : 'Financials', icon: 'dollar' },
    { id: 'create', label: language === 'ar' ? '+ بطولة جديدة' : '+ New Championship', icon: 'plus' },
  ]

  return (
    <section className="space-y-6">
      {/* Top Header & Tournament Selector Bar */}
      <SpotlightCard className="border border-white/10 bg-slate-950/80 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-sky-400/40 bg-sky-500/20 text-sky-400">
              <AppIcon name="trophy" size={22} />
            </div>
            <div>
              <ShinyText text={t('navSchedule')} className="text-xl font-black text-white" />
              <p className="text-xs text-slate-400">
                {language === 'ar' ? 'إدارة البطولات، القواعد، الفرق، الجداول، والجوائز' : 'Tournament workspace, rules, fixtures, rosters, and finances'}
              </p>
            </div>
          </div>

          {/* Tournament Dropdown Selector */}
          <div className="flex items-center gap-2.5">
            <label className="text-xs font-bold text-slate-400 hidden sm:block">
              {language === 'ar' ? 'البطولة النشطة:' : 'Active Tournament:'}
            </label>
            <select
              className="rounded-xl border border-sky-500/30 bg-slate-900/90 px-3.5 py-2 text-xs font-bold text-white focus:border-sky-400 focus:outline-none"
              value={selectedTournamentId}
              onChange={(e) => setSelectedTournamentId(e.target.value)}
            >
              {tournaments.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.status})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Workspace Navigation Tabs */}
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
          {tabs.map((tab) => {
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                  active
                    ? 'border border-sky-400 bg-sky-500/20 text-sky-300 shadow-[0_0_20px_rgba(56,189,248,0.25)]'
                    : 'border border-transparent bg-white/5 text-slate-400 hover:border-white/10 hover:text-white'
                }`}
              >
                <AppIcon name={tab.icon} size={14} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </SpotlightCard>

      {/* Status Notifications */}
      {error ? (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/15 p-3.5 text-xs font-bold text-rose-200">
          <AppIcon name="alert" size={16} className="text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {successMsg ? (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/15 p-3.5 text-xs font-bold text-emerald-200">
          <AppIcon name="check" size={16} className="text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      ) : null}

      {/* TAB 1: Core Settings & Rules */}
      {activeTab === 'settings' && details ? (
        <SpotlightCard className="border border-white/10 bg-slate-950/80 p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-sky-400 flex items-center gap-2">
              <AppIcon name="sliders" size={16} />
              <span>{language === 'ar' ? 'إعدادات البطولة والقواعد' : 'Tournament Settings & Game Rules'}</span>
            </h3>

            <div className="flex items-center gap-2">
              {isAdmin && (
                <>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleLaunchTournament}
                    className="flex items-center gap-1.5 rounded-xl border border-emerald-400 bg-emerald-500 px-4 py-2 text-xs font-black text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition hover:bg-emerald-400 disabled:opacity-50"
                  >
                    <AppIcon name="play" size={14} />
                    <span>{language === 'ar' ? 'إطلاق البطولة الآن' : 'Launch Tournament'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleDeleteTournament}
                    className="flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-xs font-bold text-rose-200 transition hover:bg-rose-500/20 disabled:opacity-50"
                  >
                    <AppIcon name="trash" size={14} />
                    <span>{language === 'ar' ? 'حذف البطولة' : 'Delete'}</span>
                  </button>
                </>
              )}
            </div>
          </div>

          <form onSubmit={handleSaveSettings} className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-300">{t('tournamentName')}</label>
              <input
                className="w-full rounded-xl border border-white/15 bg-slate-900/80 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none"
                value={settings.name}
                onChange={(e) => setSettings((s) => ({ ...s, name: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-300">{t('tournamentFormat')}</label>
              <select
                className="w-full rounded-xl border border-white/15 bg-slate-900/80 px-3.5 py-2.5 text-xs text-white focus:border-sky-400 focus:outline-none"
                value={settings.format}
                onChange={(e) => setSettings((s) => ({ ...s, format: e.target.value }))}
              >
                <option value="دوري">{t('formatLeague')}</option>
                <option value="خروج مغلوب">{t('formatKnockout')}</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-300">
                {language === 'ar' ? 'نمط التقدم' : 'Progression Format'}
              </label>
              <select
                className="w-full rounded-xl border border-white/15 bg-slate-900/80 px-3.5 py-2.5 text-xs text-white focus:border-sky-400 focus:outline-none"
                value={settings.progression_format}
                onChange={(e) => setSettings((s) => ({ ...s, progression_format: e.target.value }))}
              >
                <option value="round_robin">Round Robin (دوري عام)</option>
                <option value="knockout">Single Elimination (إقصاء مباشر)</option>
                <option value="hybrid">Hybrid Groups + Knockout (مجموعات + إقصائيات)</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-300">{t('status')}</label>
              <select
                className="w-full rounded-xl border border-white/15 bg-slate-900/80 px-3.5 py-2.5 text-xs text-white focus:border-sky-400 focus:outline-none"
                value={settings.status}
                onChange={(e) => setSettings((s) => ({ ...s, status: e.target.value }))}
              >
                <option value="draft">Draft (مسودة)</option>
                <option value="scheduled">Scheduled (مجدولة)</option>
                <option value="live">Live (مباشرة الآن)</option>
                <option value="finished">Finished (منتهية)</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-300">{t('tournamentStartTime')}</label>
              <input
                type="datetime-local"
                className="w-full rounded-xl border border-white/15 bg-slate-900/80 px-3.5 py-2.5 text-xs text-white focus:border-sky-400 focus:outline-none"
                value={settings.starts_at}
                onChange={(e) => setSettings((s) => ({ ...s, starts_at: e.target.value }))}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-300">
                {language === 'ar' ? 'موعد نهاية البطولة' : 'Tournament End Time'}
              </label>
              <input
                type="datetime-local"
                className="w-full rounded-xl border border-white/15 bg-slate-900/80 px-3.5 py-2.5 text-xs text-white focus:border-sky-400 focus:outline-none"
                value={settings.ends_at}
                onChange={(e) => setSettings((s) => ({ ...s, ends_at: e.target.value }))}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-bold text-slate-300">{t('sponsorLogoUrl')}</label>
              <input
                className="w-full rounded-xl border border-white/15 bg-slate-900/80 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none"
                value={settings.sponsor_logo_url}
                onChange={(e) => setSettings((s) => ({ ...s, sponsor_logo_url: e.target.value }))}
                placeholder="https://.../sponsor.png"
              />
            </div>

            {/* Home & Away Stage Selector */}
            <div className="sm:col-span-2 rounded-xl border border-white/10 bg-slate-900/50 p-4 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-700 text-sky-500"
                  checked={settings.home_away_enabled}
                  onChange={(e) => setSettings((s) => ({ ...s, home_away_enabled: e.target.checked }))}
                />
                <div>
                  <p className="text-xs font-bold text-white flex items-center gap-1.5">
                    <AppIcon name="exchange" size={15} className="text-sky-400" />
                    <span>{t('homeAwayTitle')}</span>
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {settings.home_away_enabled ? t('homeAwayDouble') : t('homeAwaySingle')}
                  </p>
                </div>
              </label>

              {settings.home_away_enabled && settings.format === 'خروج مغلوب' ? (
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 sm:grid-cols-3">
                  {knockoutStageOptions.map((opt) => {
                    const checked = settings.home_away_stages.includes(opt.value)
                    return (
                      <label key={opt.value} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const next = new Set(settings.home_away_stages || [])
                            if (e.target.checked) next.add(opt.value)
                            else next.delete(opt.value)
                            setSettings((s) => ({ ...s, home_away_stages: [...next] }))
                          }}
                        />
                        <span>{opt.label}</span>
                      </label>
                    )
                  })}
                </div>
              ) : null}
            </div>

            {isAdmin && (
              <div className="sm:col-span-2 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-xl border border-sky-400 bg-sky-500 px-6 py-2.5 text-xs font-bold text-slate-950 shadow-[0_0_20px_rgba(56,189,248,0.3)] transition hover:bg-sky-400 disabled:opacity-50"
                >
                  <AppIcon name="save" size={15} />
                  <span>{saving ? t('loading') : (language === 'ar' ? 'حفظ تعديلات الإعدادات' : 'Save Settings')}</span>
                </button>
              </div>
            )}
          </form>
        </SpotlightCard>
      ) : null}

      {/* TAB 2: Teams & Rosters */}
      {activeTab === 'teams' && (
        <SpotlightCard className="border border-white/10 bg-slate-950/80 p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-sky-400 flex items-center gap-2">
                <AppIcon name="users" size={16} />
                <span>{language === 'ar' ? `الفرق المسجلة (${teams.length})` : `Registered Teams (${teams.length})`}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {language === 'ar' ? 'يمكن إضافة الفرق يدوياً أو استيرادها دفعة واحدة من ملف Excel.' : 'Manage rosters manually or import in bulk from Excel.'}
              </p>
            </div>

            {isAdmin && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTeams((s) => [...s, emptyTeam()])}
                  className="flex items-center gap-1.5 rounded-xl border border-sky-500/40 bg-sky-500/20 px-3.5 py-2 text-xs font-bold text-sky-300 transition hover:bg-sky-500/30"
                >
                  <AppIcon name="plus" size={14} />
                  <span>{t('addTeam')}</span>
                </button>

                <input
                  ref={teamsImportRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    try {
                      const imported = await readTeamsFromWorkbook(file)
                      if (imported.length) {
                        setTeams(imported)
                        showSuccess(language === 'ar' ? `تم استيراد ${imported.length} فريقاً` : `Imported ${imported.length} teams`)
                      }
                    } catch {
                      setError(language === 'ar' ? 'فشل قراءة ملف Excel' : 'Failed to read Excel file')
                    }
                  }}
                />

                <button
                  type="button"
                  onClick={() => teamsImportRef.current?.click()}
                  className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-white/10"
                >
                  <AppIcon name="download" size={14} />
                  <span>{language === 'ar' ? 'استيراد من Excel' : 'Import Excel'}</span>
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSaveTeams}
                  className="flex items-center gap-1.5 rounded-xl border border-emerald-400 bg-emerald-500 px-5 py-2 text-xs font-bold text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition hover:bg-emerald-400 disabled:opacity-50"
                >
                  <AppIcon name="save" size={14} />
                  <span>{saving ? t('loading') : (language === 'ar' ? 'حفظ الفرق وتوليد المباريات' : 'Save & Regenerate Fixtures')}</span>
                </button>
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {pagedTeams.map((team, idx) => {
              const realIndex = (teamsPage - 1) * TEAMS_PER_PAGE + idx
              return (
                <div key={realIndex} className="rounded-xl border border-white/10 bg-slate-900/60 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400">
                      {language === 'ar' ? `فريق #${realIndex + 1}` : `Team #${realIndex + 1}`}
                    </span>
                    {teams.length > 2 && isAdmin ? (
                      <button
                        type="button"
                        onClick={() => setTeams((s) => s.filter((_, tIdx) => tIdx !== realIndex))}
                        className="text-rose-400 hover:text-rose-300 p-1"
                      >
                        <AppIcon name="trash" size={14} />
                      </button>
                    ) : null}
                  </div>

                  <input
                    className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none"
                    placeholder={t('teamName')}
                    value={team.team_name}
                    onChange={(e) => {
                      const val = e.target.value
                      setTeams((s) => s.map((item, tIdx) => (tIdx === realIndex ? { ...item, team_name: val } : item)))
                    }}
                  />

                  <input
                    className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none"
                    placeholder={t('clubName')}
                    value={team.club_name}
                    onChange={(e) => {
                      const val = e.target.value
                      setTeams((s) => s.map((item, tIdx) => (tIdx === realIndex ? { ...item, club_name: val } : item)))
                    }}
                  />
                </div>
              )
            })}
          </div>

          {teamsPagesCount > 1 ? (
            <div className="flex items-center justify-center gap-2 pt-3">
              {Array.from({ length: teamsPagesCount }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setTeamsPage(i + 1)}
                  className={`h-7 w-7 rounded-lg text-xs font-bold ${
                    teamsPage === i + 1 ? 'bg-sky-400 text-black' : 'bg-white/5 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          ) : null}
        </SpotlightCard>
      )}

      {/* TAB 3: Fixtures & Bulk Schedule */}
      {activeTab === 'fixtures' && (
        <SpotlightCard className="border border-white/10 bg-slate-950/80 p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-sky-400 flex items-center gap-2">
                <AppIcon name="calendar" size={16} />
                <span>{language === 'ar' ? `جدول المباريات والمواعيد (${allMatches.length})` : `Match Fixtures (${allMatches.length})`}</span>
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => downloadCustomTournamentTemplate(details)}
                className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-white/10"
              >
                <AppIcon name="download" size={13} />
                <span>{language === 'ar' ? 'تحميل نموذج Excel' : 'Excel Template'}</span>
              </button>

              <input
                ref={scheduleWorkbookRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file || !selectedTournamentId) return
                  try {
                    const payload = await readCustomTournamentWorkbook(file)
                    const updated = await importTournamentCustomSchedule(Number(selectedTournamentId), payload)
                    setDetails(updated)
                    showSuccess(language === 'ar' ? 'تم استيراد جدول المباريات المخصص بنجاح!' : 'Schedule imported successfully!')
                  } catch (err) {
                    setError(err?.response?.data?.message || 'Failed to import workbook')
                  }
                }}
              />

              <button
                type="button"
                onClick={() => scheduleWorkbookRef.current?.click()}
                className="flex items-center gap-1.5 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs font-bold text-sky-300 transition hover:bg-sky-500/20"
              >
                <AppIcon name="save" size={13} />
                <span>{language === 'ar' ? 'استيراد جدول مخصص' : 'Import Schedule'}</span>
              </button>
            </div>
          </div>

          {/* Bulk Scheduler Banner */}
          {isAdmin && (
            <div className="rounded-2xl border border-sky-500/20 bg-slate-900/80 p-4 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                <AppIcon name="sparkles" size={15} />
                <span>{language === 'ar' ? 'الجدولة التلقائية الذكية للمباريات' : 'Smart Bulk Auto-Scheduler'}</span>
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-[11px] font-bold text-slate-300">
                    {language === 'ar' ? 'موعد انطلاق أول مباراة' : 'First Match Start Time'}
                  </label>
                  <input
                    type="datetime-local"
                    className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-xs text-white focus:border-sky-400 focus:outline-none"
                    value={bulkConfig.first_match_starts_at}
                    onChange={(e) => setBulkConfig((s) => ({ ...s, first_match_starts_at: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-bold text-slate-300">
                    {language === 'ar' ? 'الفاصل الزمني بين المباريات (بالدقائق)' : 'Interval Between Matches (Mins)'}
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="120"
                    className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-xs text-white focus:border-sky-400 focus:outline-none"
                    value={bulkConfig.interval_minutes}
                    onChange={(e) => setBulkConfig((s) => ({ ...s, interval_minutes: Number(e.target.value) || 15 }))}
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleBulkSchedule}
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-sky-400 bg-sky-500 py-2.5 text-xs font-bold text-slate-950 shadow-[0_0_15px_rgba(56,189,248,0.3)] transition hover:bg-sky-400 disabled:opacity-50"
                  >
                    <AppIcon name="calendar" size={14} />
                    <span>{language === 'ar' ? 'تطبيق الجدولة التلقائية' : 'Apply Bulk Schedule'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Matches List */}
          <div className="space-y-2.5">
            {pagedMatches.map((match) => {
              const home = teamNameById.get(match.home_team_id) || '--'
              const away = teamNameById.get(match.away_team_id) || '--'
              return (
                <div
                  key={match.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-900/60 p-3.5 transition hover:border-white/20"
                >
                  <div className="min-w-0 flex items-center gap-3">
                    <span className="rounded-lg bg-black/50 px-2 py-1 font-mono text-xs font-bold text-slate-400">
                      #{match.order || match.id}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-white">
                        {home} <span className="text-amber-400 font-mono">VS</span> {away}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {match.stage_name || `Round ${match.round_number}`} • {match.status}
                      </p>
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-2">
                      <input
                        type="datetime-local"
                        className="rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-xs text-white focus:border-sky-400 focus:outline-none"
                        value={matchTimes[match.id] || ''}
                        onChange={(e) => {
                          const val = e.target.value
                          setMatchTimes((s) => ({ ...s, [match.id]: val }))
                        }}
                      />
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => handleSaveSingleMatch(match.id)}
                        className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs font-bold text-sky-300 transition hover:bg-sky-500/20"
                      >
                        {language === 'ar' ? 'حفظ' : 'Save'}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {matchesPagesCount > 1 ? (
            <div className="flex items-center justify-center gap-2 pt-3">
              {Array.from({ length: matchesPagesCount }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setMatchesPage(i + 1)}
                  className={`h-7 w-7 rounded-lg text-xs font-bold ${
                    matchesPage === i + 1 ? 'bg-sky-400 text-black' : 'bg-white/5 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          ) : null}
        </SpotlightCard>
      )}

      {/* TAB 4: Progression & Rounds */}
      {activeTab === 'progression' && (
        <SpotlightCard className="border border-white/10 bg-slate-950/80 p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-sky-400 flex items-center gap-2">
              <AppIcon name="trophy" size={16} />
              <span>{language === 'ar' ? 'إدارة التقدم والأدوار الإقصائية' : 'Round Progression & Advancements'}</span>
            </h3>

            {isAdmin && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleToggleProgressionLock}
                  className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition ${
                    progress?.progressionLocked
                      ? 'border-rose-500/40 bg-rose-500/20 text-rose-300'
                      : 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
                  }`}
                >
                  <AppIcon name={progress?.progressionLocked ? 'lock' : 'check'} size={14} />
                  <span>
                    {progress?.progressionLocked
                      ? (language === 'ar' ? 'التقدم مقفل (اضغط للفتح)' : 'Locked (Click to Unlock)')
                      : (language === 'ar' ? 'التقدم مفتوح (اضغط للقفل)' : 'Unlocked (Click to Lock)')}
                  </span>
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={handleGenerateNextRound}
                  className="flex items-center gap-1.5 rounded-xl border border-sky-400 bg-sky-500 px-4 py-2 text-xs font-bold text-slate-950 shadow-[0_0_15px_rgba(56,189,248,0.3)] transition hover:bg-sky-400 disabled:opacity-50"
                >
                  <AppIcon name="sparkles" size={14} />
                  <span>{language === 'ar' ? 'توليد مواجهات الدور التالي' : 'Generate Next Round'}</span>
                </button>
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
              <span className="text-xs text-slate-400">{language === 'ar' ? 'حالة الجولة الحالية' : 'Round Status'}</span>
              <p className="text-lg font-black text-white mt-1">
                {progress?.canAdvance ? (
                  <span className="text-emerald-400">{language === 'ar' ? 'مكتملة وجاهزة للتقدم' : 'Ready to Advance'}</span>
                ) : (
                  <span className="text-amber-400">{language === 'ar' ? 'قيد اللعب والتنافس' : 'Matches in Progress'}</span>
                )}
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
              <span className="text-xs text-slate-400">{language === 'ar' ? 'المباريات المكتملة' : 'Completed Matches'}</span>
              <p className="text-lg font-black text-white mt-1">
                {progress?.completedMatchesCount ?? 0} / {progress?.totalMatchesCount ?? 0}
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
              <span className="text-xs text-slate-400">{language === 'ar' ? 'نسبة الإنجاز' : 'Completion Rate'}</span>
              <p className="text-lg font-black text-sky-400 mt-1 font-mono">
                {progress?.totalMatchesCount
                  ? Math.round(((progress.completedMatchesCount || 0) / progress.totalMatchesCount) * 100)
                  : 0}
                %
              </p>
            </div>
          </div>
        </SpotlightCard>
      )}

      {/* TAB 5: Financials */}
      {activeTab === 'finance' && (
        <SpotlightCard className="border border-white/10 bg-slate-950/80 p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-sky-400 flex items-center gap-2">
              <AppIcon name="dollar" size={16} />
              <span>{language === 'ar' ? 'الإعداد المالي والجوائز المالية' : 'Tournament Financial Setup & Prize Pool'}</span>
            </h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-300">{t('entryFee')}</label>
              <input
                type="number"
                className="w-full rounded-xl border border-white/15 bg-slate-900/80 px-3.5 py-2.5 text-xs text-white focus:border-sky-400 focus:outline-none"
                value={financial.entry_fee}
                onChange={(e) => setFinancial((s) => ({ ...s, entry_fee: e.target.value }))}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-300">{t('sponsorAmount')}</label>
              <input
                type="number"
                className="w-full rounded-xl border border-white/15 bg-slate-900/80 px-3.5 py-2.5 text-xs text-white focus:border-sky-400 focus:outline-none"
                value={financial.sponsor_amount}
                onChange={(e) => setFinancial((s) => ({ ...s, sponsor_amount: e.target.value }))}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-300">{t('hourRate')}</label>
              <input
                type="number"
                className="w-full rounded-xl border border-white/15 bg-slate-900/80 px-3.5 py-2.5 text-xs text-white focus:border-sky-400 focus:outline-none"
                value={financial.hour_rate}
                onChange={(e) => setFinancial((s) => ({ ...s, hour_rate: e.target.value }))}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-300">
                {language === 'ar' ? 'مدة المباراة (دقائق)' : 'Match Duration (Mins)'}
              </label>
              <input
                type="number"
                className="w-full rounded-xl border border-white/15 bg-slate-900/80 px-3.5 py-2.5 text-xs text-white focus:border-sky-400 focus:outline-none"
                value={financial.match_duration_minutes}
                onChange={(e) => setFinancial((s) => ({ ...s, match_duration_minutes: e.target.value }))}
              />
            </div>

            {isAdmin && (
              <div className="sm:col-span-2 md:col-span-4 pt-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSaveFinancial}
                  className="flex items-center gap-2 rounded-xl border border-emerald-400 bg-emerald-500 px-6 py-2.5 text-xs font-bold text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition hover:bg-emerald-400 disabled:opacity-50"
                >
                  <AppIcon name="save" size={15} />
                  <span>{saving ? t('loading') : (language === 'ar' ? 'حفظ الحسابات المالية' : 'Save Financial Calculations')}</span>
                </button>
              </div>
            )}
          </div>
        </SpotlightCard>
      )}

      {/* TAB 6: Create New Championship */}
      {activeTab === 'create' && (
        <SpotlightCard className="border border-sky-500/30 bg-slate-950/90 p-6 space-y-5">
          <div className="border-b border-white/10 pb-4">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <AppIcon name="plus" size={18} className="text-sky-400" />
              <span>{language === 'ar' ? 'إنشاء بطولة فيفا جديدة' : 'Create New FIFA Championship'}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {language === 'ar' ? 'حدد القواعد والنمط والتواريخ لإنشاء البطولة ومزامنة شاشات العرض.' : 'Configure parameters to deploy tournament and sync spectator displays.'}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-300">{t('tournamentName')}</label>
              <input
                className="w-full rounded-xl border border-white/15 bg-slate-900/80 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none"
                placeholder={t('tournamentNamePlaceholder')}
                value={createForm.name}
                onChange={(e) => setCreateForm((s) => ({ ...s, name: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-300">{t('tournamentFormat')}</label>
              <select
                className="w-full rounded-xl border border-white/15 bg-slate-900/80 px-3.5 py-2.5 text-xs text-white focus:border-sky-400 focus:outline-none"
                value={createForm.format}
                onChange={(e) => setCreateForm((s) => ({ ...s, format: e.target.value }))}
              >
                <option value="دوري">{t('formatLeague')}</option>
                <option value="خروج مغلوب">{t('formatKnockout')}</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-300">
                {language === 'ar' ? 'نمط التقدم' : 'Progression Format'}
              </label>
              <select
                className="w-full rounded-xl border border-white/15 bg-slate-900/80 px-3.5 py-2.5 text-xs text-white focus:border-sky-400 focus:outline-none"
                value={createForm.progression_format}
                onChange={(e) => setCreateForm((s) => ({ ...s, progression_format: e.target.value }))}
              >
                <option value="round_robin">Round Robin (دوري عام)</option>
                <option value="knockout">Single Elimination (إقصاء مباشر)</option>
                <option value="hybrid">Hybrid Groups + Knockout (مجموعات + إقصائيات)</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-300">{t('tournamentStartTime')}</label>
              <input
                type="datetime-local"
                className="w-full rounded-xl border border-white/15 bg-slate-900/80 px-3.5 py-2.5 text-xs text-white focus:border-sky-400 focus:outline-none"
                value={createForm.starts_at}
                onChange={(e) => setCreateForm((s) => ({ ...s, starts_at: e.target.value }))}
              />
            </div>

            <div className="sm:col-span-2 pt-2">
              <button
                type="button"
                disabled={saving}
                onClick={handleCreateTournament}
                className="flex items-center gap-2 rounded-xl border border-sky-400 bg-sky-500 px-6 py-2.5 text-xs font-bold text-slate-950 shadow-[0_0_20px_rgba(56,189,248,0.4)] transition hover:bg-sky-400 disabled:opacity-50"
              >
                <AppIcon name="plus" size={15} />
                <span>{saving ? t('loading') : (language === 'ar' ? 'إنشاء البطولة وبدء إعداد الفرق' : 'Create Tournament & Configure Teams')}</span>
              </button>
            </div>
          </div>
        </SpotlightCard>
      )}
    </section>
  )
}
