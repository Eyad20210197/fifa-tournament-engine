import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useTournamentStore } from '../store/tournamentStore'
import { RamadanStage } from '../components/common/RamadanStage'
import { downloadTextFile } from '../utils/download'
import { TeamManager } from '../components/common/TeamManager'
import { TournamentGenerator } from '../components/common/TournamentGenerator'
import { SponsorManager } from '../components/common/SponsorManager'
import { MatchControl } from '../components/common/MatchControl'
import { VideoManager } from '../components/common/VideoManager'
import { useAblyChannel } from '../hooks/useAblyChannel'
import { tournamentChannel } from '../services/channelNames'
import { fetchCurrentLiveState } from '../services/liveStateService'
import { fetchTournamentDetails, fetchTournaments, fetchTodaysMatches } from '../services/tournamentService'
import { useAuth } from '../auth/useAuth'
import { ROLES } from '../auth/roles'

function mapDetailsToControlState(details) {
  const format = details?.format || 'دوري'
  const mode = format === 'خروج مغلوب' ? 'knockout' : 'league'

  return {
    tournament: {
      id: details?.id ? Number(details.id) : null,
      name: details?.name || 'Tournament',
      format,
    },
    teams: (details?.teams || []).map((team) => ({
      id: Number(team.id),
      teamName: team.team_name || '--',
      clubName: team.club_name || '',
    })),
    matches: (details?.matches || []).map((match, index) => ({
      id: Number(match.id),
      order: index + 1,
      mode,
      startsAt: match.starts_at || null,
      homeTeamId: match.home_team_id ? Number(match.home_team_id) : null,
      awayTeamId: match.away_team_id ? Number(match.away_team_id) : null,
      homeScore: Number(match.home_score || 0),
      awayScore: Number(match.away_score || 0),
      status: match.status || 'pending',
      round: Number(match.round_number || 1),
      stageName: match.stage_name || '',
      legNumber: Number(match.leg_number || 1),
      resultConfirmed: false,
      winnerTeamId: null,
    })),
    sponsor: {
      urls: details?.sponsor_logo_url ? [details.sponsor_logo_url] : [],
    },
  }
}

export default function Control() {
  const { role } = useAuth()
  const isAdmin = role === ROLES.ADMIN
  const hydrated = useTournamentStore((s) => s._meta.hydrated)
  const tournamentName = useTournamentStore((s) => s.tournament.name)
  const tournamentId = useTournamentStore((s) => s.tournament.id)
  const activeScreen = useTournamentStore((s) => s.activeScreen)
  const setActiveScreen = useTournamentStore((s) => s.setActiveScreen)
  const exportJSON = useTournamentStore((s) => s.exportJSON)
  const importJSON = useTournamentStore((s) => s.importJSON)
  const resetAll = useTournamentStore((s) => s.resetAll)

  const [importError, setImportError] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    async function bootstrapControl() {
      const snapshot = await fetchCurrentLiveState().catch(() => null)
      const snapshotLooksIncomplete =
        snapshot &&
        Array.isArray(snapshot.teams) &&
        Array.isArray(snapshot.matches) &&
        snapshot.teams.length === 0 &&
        snapshot.matches.length === 0 &&
        (snapshot?.liveMatchState?.matchId != null || (snapshot.activeScreen && snapshot.activeScreen !== 'opening'))

      if (snapshot && !snapshotLooksIncomplete) {
        useTournamentStore.getState().applyRemoteState(snapshot)
      } else {
        const tournaments = await fetchTournaments().catch(() => [])
        const target =
          tournaments.find((item) => item.status === 'live') ||
          tournaments.find((item) => item.status === 'scheduled') ||
          tournaments[0]

        if (target?.id) {
          const details = await fetchTournamentDetails(Number(target.id)).catch(() => null)
          if (details) {
            useTournamentStore.getState().applyRemoteState(mapDetailsToControlState(details))
            // Force a persisted snapshot refresh so stale/incomplete remote payloads are repaired.
            useTournamentStore.getState().setActiveScreen(useTournamentStore.getState().activeScreen || 'opening')
          }
        }
      }

    }

    void bootstrapControl()
    return undefined
  }, [])

  useEffect(() => {
    const syncFromServer = async () => {
      const snapshot = await fetchCurrentLiveState().catch(() => null)
      if (snapshot && typeof snapshot === 'object') {
        useTournamentStore.getState().applyRemoteState(snapshot)
      }
    }

    const intervalId = setInterval(() => {
      void syncFromServer()
    }, 12000)

    return () => {
      clearInterval(intervalId)
    }
  }, [])

  useAblyChannel(tournamentChannel(tournamentId), 'state:update', (data) => {
    const snapshot = data?.snapshot || data?.payload || data
    if (snapshot && typeof snapshot === 'object') {
      useTournamentStore.getState().applyRemoteState(snapshot)
    }
  })

  useAblyChannel(tournamentChannel(tournamentId), 'timer:update', (data) => {
    if (data?.matchId != null) {
      useTournamentStore.getState().applyMatchTimerUpdate(data)
    }
  })

  useAblyChannel(tournamentChannel(tournamentId), 'timer:clear', (data) => {
    if (data?.matchId != null) {
      useTournamentStore.getState().clearMatchTimerLocal(data.matchId)
    }
  })

  const screens = useMemo(
    () => [
      { id: 'opening', label: 'شاشة الافتتاح' },
      { id: 'live', label: 'مباراة مباشرة' },
      { id: 'standings', label: 'الترتيب' },
      { id: 'bracket', label: 'شجرة البطولة' },
      { id: 'schedule', label: 'الجدول' },
    ],
    [],
  )
  const displayUrl = useMemo(() => new URL('/display', window.location.href).toString(), [])

  async function onImportFile(file) {
    if (!file) return
    setImportError(null)
    try {
      const text = await file.text()
      await importJSON(text)
    } catch (error) {
      setImportError(error?.message || 'فشل الاستيراد')
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <RamadanStage>
      <div className="mx-auto w-full max-w-[1700px] px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-3xl border border-white/10 bg-[var(--surface-card)]/70 p-4 backdrop-blur md:p-6"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs text-[var(--text-secondary)]">لوحة التحكم المباشر</p>
              <h1 className="mt-1 text-2xl font-semibold">{tournamentName}</h1>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                الحالة: {hydrated ? 'جاهز' : 'جار تحميل البيانات'} • الشاشة الحالية: {labelFor(activeScreen)}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {isAdmin ? (
                <>
                  <button
                    className="min-h-11 rounded-2xl bg-[var(--primary-color)] px-4 py-2 text-sm font-semibold text-[#07162b]"
                    onClick={() => downloadTextFile(`backup-${Date.now()}.json`, exportJSON())}
                  >
                    تصدير
                  </button>

                  <input
                    ref={fileInputRef}
                    className="hidden"
                    type="file"
                    accept="application/json"
                    onChange={(event) => onImportFile(event.target.files?.[0])}
                  />
                  <button
                    className="min-h-11 rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    استيراد
                  </button>

                  <button
                    className="min-h-11 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-100"
                    onClick={() => resetAll()}
                  >
                    إعادة ضبط
                  </button>
                </>
              ) : null}
            </div>
          </div>

          {importError ? (
            <div className="mt-4 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-100">{importError}</div>
          ) : null}

          <div className="mt-6">
            <p className="text-sm text-[var(--text-secondary)]">تبديل شاشة العرض المباشر</p>
            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-5">
              {screens.map((screen) => {
                const isActive = activeScreen === screen.id
                return (
                  <button
                    key={screen.id}
                    onClick={() => setActiveScreen(screen.id)}
                    className={[
                      'min-h-11 rounded-2xl border px-3 py-2 text-sm transition',
                      isActive
                        ? 'border-[var(--primary-color)]/60 bg-[var(--primary-color)]/10 text-[var(--secondary-color)]'
                        : 'border-white/10 bg-white/5 text-[var(--text-primary)] hover:bg-white/10',
                    ].join(' ')}
                  >
                    {screen.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <Card title="رابط شاشة العرض">
              <p className="text-sm text-[var(--text-secondary)]">استخدم الرابط التالي على شاشة التلفاز:</p>
              <code className="mt-2 block rounded-xl bg-black/30 px-3 py-2 text-sm">{displayUrl}</code>
            </Card>
            <Card title="ملاحظات التشغيل">
              <p className="text-sm text-[var(--text-secondary)]">
                {isAdmin
                  ? 'ابدأ بتجهيز الفرق ثم توليد البطولة، وبعدها استخدم التحكم بالمباريات أدناه.'
                  : 'للطاقم: التحكم المسموح هو التبديل بين شاشات العرض وإدارة المباراة المباشرة فقط.'}
              </p>
            </Card>
          </div>

          {isAdmin ? (
            <>
              <div className="mt-8">
                <TeamManager />
              </div>

              <div className="mt-6">
                <TournamentGenerator />
              </div>

              <div className="mt-6 grid gap-6 lg:grid-cols-4">
                <SponsorManager />
                <div className="lg:col-span-3">
                  <MatchControl />
                </div>
              </div>

              <div className="mt-6">
                <VideoManager />
              </div>
            </>
          ) : (
            <div className="mt-6">
              <MatchControl />
            </div>
          )}
        </motion.div>
      </div>
    </RamadanStage>
  )
}

function Card({ title, children }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-sm font-semibold">{title}</p>
      <div className="mt-2">{children}</div>
    </div>
  )
}

function labelFor(activeScreen) {
  if (activeScreen === 'opening') return 'شاشة الافتتاح'
  if (activeScreen === 'live') return 'مباراة مباشرة'
  if (activeScreen === 'standings') return 'الترتيب'
  if (activeScreen === 'bracket') return 'شجرة البطولة'
  if (activeScreen === 'schedule') return 'الجدول'
  return activeScreen
}
