import { create } from 'zustand'
import { generateTournamentData } from '../utils/tournament/generate'
import { computeStandings } from '../utils/tournament/standings'
import {
  adjustMatchTimer,
  clearMatchTimer,
  pauseMatchTimer,
  resumeMatchTimer,
  saveCurrentLiveState,
  setMatchTimerDuration,
  startMatchTimer,
} from '../services/liveStateService'
import { updateMatch } from '../services/tournamentService'

const DEFAULT_TIMER_DURATION_MS = 10 * 60 * 1000

function nowMs() {
  return Date.now()
}

function getEffectiveRemainingMs(timer, atMs = nowMs()) {
  if (!timer) return 0
  const baseRemaining = Math.max(0, Number(timer.remainingMs ?? 0))
  const status = String(timer.status || 'paused')
  if (status !== 'running') return baseRemaining
  const syncedAt = Number(timer.syncedAt ?? atMs)
  const elapsed = Math.max(0, atMs - syncedAt)
  return Math.max(0, baseRemaining - elapsed)
}

function normalizeTimerState(value, atMs = nowMs()) {
  const durationMs = Math.max(1, Number(value?.durationMs ?? DEFAULT_TIMER_DURATION_MS))
  const remainingRaw = Math.max(0, Number(value?.remainingMs ?? durationMs))
  const status = ['running', 'paused', 'finished'].includes(String(value?.status)) ? String(value.status) : 'paused'
  const syncedAt = Number(value?.syncedAt ?? atMs)
  const remainingMs = status === 'running' ? Math.max(0, remainingRaw) : remainingRaw
  return {
    durationMs,
    remainingMs: status === 'finished' ? 0 : remainingMs,
    status: status === 'finished' || remainingMs <= 0 ? 'finished' : status,
    syncedAt,
  }
}

function persistedSlice(state) {
  const { tournament, teams, matches, standings, activeScreen, sponsor, liveMatchState, matchTimers } = state
  return { tournament, teams, matches, standings, activeScreen, sponsor, liveMatchState, matchTimers }
}

function normalizeSponsor(sponsorInput) {
  if (!sponsorInput || typeof sponsorInput !== 'object') return { urls: [] }
  if (Array.isArray(sponsorInput.urls)) {
    return { urls: sponsorInput.urls.map((item) => String(item || '').trim()).filter(Boolean) }
  }
  const legacyLogo = String(sponsorInput.logoBase64 || '').trim()
  if (legacyLogo && /^https?:\/\//i.test(legacyLogo)) return { urls: [legacyLogo] }
  return { urls: [] }
}

function normalizeMatchTimers(input) {
  if (!input || typeof input !== 'object') return {}
  const output = {}
  const ts = nowMs()
  for (const [rawMatchId, value] of Object.entries(input)) {
    const matchId = Number(rawMatchId)
    if (!Number.isFinite(matchId) || matchId <= 0 || !value || typeof value !== 'object') continue
    output[matchId] = normalizeTimerState(value, ts)
  }
  return output
}

function isLikelyIncompleteLiveSnapshot(payload) {
  if (!payload || typeof payload !== 'object') return false
  const teamsEmpty = Array.isArray(payload.teams) && payload.teams.length === 0
  const matchesEmpty = Array.isArray(payload.matches) && payload.matches.length === 0
  if (!teamsEmpty && !matchesEmpty) return false
  const hasLiveMatch = payload?.liveMatchState?.matchId != null
  return hasLiveMatch
}

function mergedCollections(currentState, payload) {
  const keepExisting = isLikelyIncompleteLiveSnapshot(payload)
  const teams = Array.isArray(payload?.teams) ? (keepExisting && currentState.teams.length > 0 ? currentState.teams : payload.teams) : currentState.teams
  const matches = Array.isArray(payload?.matches) ? (keepExisting && currentState.matches.length > 0 ? currentState.matches : payload.matches) : currentState.matches
  const standings = Array.isArray(payload?.standings) ? (keepExisting && currentState.standings.length > 0 ? currentState.standings : payload.standings) : currentState.standings
  return { teams, matches, standings }
}

function defaultTournament() {
  return {
    id: null,
    name: 'بطولة رمضان 2026',
    format: 'دوري',
  }
}

function sortMatchesByDate(matches) {
  if (!Array.isArray(matches)) return []
  return [...matches].sort((a, b) => {
    const rawA = a.starts_at || a.startsAt
    const rawB = b.starts_at || b.startsAt
    const timeA = rawA ? new Date(rawA).getTime() : NaN
    const timeB = rawB ? new Date(rawB).getTime() : NaN

    const aHasDate = !isNaN(timeA)
    const bHasDate = !isNaN(timeB)

    if (aHasDate && bHasDate) {
      if (timeA !== timeB) return timeA - timeB
    } else if (aHasDate) {
      return -1 // a comes first
    } else if (bHasDate) {
      return 1 // b comes first
    }

    // Fallback for matches with same or no date
    const roundA = a.round_number ?? a.round ?? 0
    const roundB = b.round_number ?? b.round ?? 0
    if (roundA !== roundB) {
      return roundA - roundB
    }

    return (a.id || 0) - (b.id || 0)
  })
}

function defaultState() {
  return {
    tournament: defaultTournament(),
    teams: [],
    matches: [],
    standings: [],
    activeScreen: 'opening',
    sponsor: {
      urls: [],
    },
    liveMatchState: {
      matchId: null,
      goalEvents: [],
    },
    matchTimers: {},
    _meta: {
      hydrated: true,
      lastSavedAt: null,
      lastReceivedAt: null,
      syncEnabled: false,
    },
  }
}

function statusForRemaining(remainingMs, statusHint) {
  if (Number(remainingMs) <= 0) return 'finished'
  if (statusHint === 'running' || statusHint === 'paused') return statusHint
  return 'paused'
}

let liveBroadcastChannel = null
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    liveBroadcastChannel = new BroadcastChannel('fifa_live_state')
  }
} catch {
  // ignore
}

export const useTournamentStore = create((set, get) => {
  let commitQueue = Promise.resolve()

  async function commit(nextState) {
    const snapshot = persistedSlice(nextState)

    try {
      liveBroadcastChannel?.postMessage({
        type: 'STATE_UPDATE',
        snapshot,
        timestamp: Date.now(),
      })
    } catch {
      // ignore
    }

    commitQueue = commitQueue
      .then(async () => {
        await saveCurrentLiveState(snapshot).catch(() => null)
        set((s) => ({ _meta: { ...s._meta, lastSavedAt: Date.now() } }))
      })
      .catch((err) => {
        console.error('Failed to persist live snapshot:', err)
      })
  }

  function setState(mutator) {
    set((state) => {
      const next = typeof mutator === 'function' ? mutator(state) : { ...state, ...mutator }
      queueMicrotask(() => {
        void commit(get())
      })
      return next
    })
  }

  function getScopedMatchId(matchId) {
    if (Number.isFinite(Number(matchId)) && Number(matchId) > 0) return Number(matchId)
    const selected = Number(get().liveMatchState.matchId)
    return Number.isFinite(selected) && selected > 0 ? selected : null
  }

  function getActiveTournamentId() {
    const id = Number(get().tournament?.id)
    return Number.isFinite(id) && id > 0 ? id : null
  }

  function updateMatchTimerLocal(matchId, patch) {
    const id = Number(matchId)
    if (!Number.isFinite(id) || id <= 0) return
    const ts = nowMs()
    set((state) => {
      const current = normalizeTimerState(state.matchTimers[id] || {
        remainingMs: DEFAULT_TIMER_DURATION_MS,
        durationMs: DEFAULT_TIMER_DURATION_MS,
        status: 'paused',
        syncedAt: ts,
      }, ts)
      const merged = { ...current, ...patch, syncedAt: patch?.syncedAt ?? ts }
      const next = normalizeTimerState(merged, ts)
      return {
        ...state,
        matchTimers: {
          ...state.matchTimers,
          [id]: next,
        },
      }
    })
  }

  return {
    ...defaultState(),

    hydrate: async () => {
      set((s) => ({ ...s, _meta: { ...s._meta, hydrated: true } }))
    },

    applyRemoteState: (payload) => {
      if (!payload) return
      set((s) => {
        const merged = mergedCollections(s, payload)
        return {
          ...s,
          ...payload,
          ...merged,
          matches: sortMatchesByDate(merged.matches),
          sponsor: payload.sponsor ? normalizeSponsor(payload.sponsor) : s.sponsor,
          matchTimers: payload.matchTimers ? normalizeMatchTimers(payload.matchTimers) : s.matchTimers,
          liveMatchState: payload.liveMatchState
            ? {
                matchId: payload.liveMatchState.matchId ?? s.liveMatchState.matchId,
                goalEvents: Array.isArray(payload.liveMatchState.goalEvents)
                  ? payload.liveMatchState.goalEvents
                  : s.liveMatchState.goalEvents,
              }
            : s.liveMatchState,
          _meta: { ...s._meta, lastReceivedAt: Date.now(), syncEnabled: true, hydrated: true },
        }
      })
    },

    applyMatchTimerUpdate: ({ matchId, remainingMs, status, durationMs }) => {
      const id = Number(matchId)
      if (!Number.isFinite(id) || id <= 0) return
      const ts = nowMs()
      set((state) => {
        const current = normalizeTimerState(state.matchTimers[id] || {
          remainingMs: DEFAULT_TIMER_DURATION_MS,
          durationMs: DEFAULT_TIMER_DURATION_MS,
          status: 'paused',
          syncedAt: ts,
        }, ts)
        const next = normalizeTimerState(
          {
            ...current,
            remainingMs: Math.max(0, Number(remainingMs ?? getEffectiveRemainingMs(current, ts))),
            durationMs: Math.max(1, Number(durationMs ?? current.durationMs)),
            status: statusForRemaining(remainingMs ?? current.remainingMs, status || current.status),
            syncedAt: ts,
          },
          ts,
        )
        return {
          ...state,
          matchTimers: {
            ...state.matchTimers,
            [id]: next,
          },
        }
      })
    },

    clearMatchTimerLocal: (matchId) => {
      const id = Number(matchId)
      if (!Number.isFinite(id) || id <= 0) return
      set((state) => {
        if (!state.matchTimers[id]) return state
        const next = { ...state.matchTimers }
        delete next[id]
        return { ...state, matchTimers: next }
      })
    },

    setTournament: (partial) =>
      setState((s) => ({ ...s, tournament: { ...s.tournament, ...partial } })),

    addTeam: (teamInput) =>
      setState((s) => {
        const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
        const team = {
          id,
          teamName: teamInput?.teamName?.trim?.() ?? '',
          logo: teamInput?.logo ?? null,
          clubName: teamInput?.clubName?.trim?.() ?? '',
          player1: teamInput?.player1?.trim?.() ?? '',
          player2: teamInput?.player2?.trim?.() ?? '',
        }
        return { ...s, teams: [team, ...s.teams] }
      }),

    updateTeam: (teamId, patch) =>
      setState((s) => ({
        ...s,
        teams: s.teams.map((t) =>
          t.id === teamId
            ? {
                ...t,
                ...patch,
                teamName: patch?.teamName !== undefined ? String(patch.teamName).trim() : t.teamName,
                clubName: patch?.clubName !== undefined ? String(patch.clubName).trim() : t.clubName,
                player1: patch?.player1 !== undefined ? String(patch.player1).trim() : t.player1,
                player2: patch?.player2 !== undefined ? String(patch.player2).trim() : t.player2,
              }
            : t,
        ),
      })),

    deleteTeam: (teamId) =>
      setState((s) => ({
        ...s,
        teams: s.teams.filter((t) => t.id !== teamId),
      })),

        generateTournament: ({ format } = {}) =>
      setState((s) => {
        const nextFormat = format ?? s.tournament.format ?? 'دوري'
        const sortedTeams = [...s.teams].sort((a, b) => a.teamName.localeCompare(b.teamName))
        const { matches, standings } = generateTournamentData({ teams: sortedTeams, format: nextFormat })
        const sortedMatches = sortMatchesByDate(matches)
        const nextStandings = nextFormat === 'دوري' ? computeStandings(s.teams, sortedMatches) : standings
        return {
          ...s,
          tournament: { ...s.tournament, format: nextFormat },
          matches: sortedMatches,
          standings: nextStandings,
          liveMatchState: { ...s.liveMatchState, matchId: null, goalEvents: [] },
          matchTimers: {},
        }
      }),

    recalcStandings: () =>
      setState((s) => ({ ...s, standings: computeStandings(s.teams, s.matches) })),

    setLiveMatch: (matchId) =>
      setState((s) => ({
        ...s,
        liveMatchState: { ...s.liveMatchState, matchId },
      })),

    startMatch: (matchId) => {
      const state = get()
      const match = state.matches.find((m) => m.id === matchId)
      if (!match) throw new Error('المباراة غير موجودة')
      if (!match.homeTeamId || !match.awayTeamId) throw new Error('لا يمكن بدء مباراة بدون فريقين')

      const patch = { status: 'live', resultConfirmed: false, winnerTeamId: null }

      setState((s) => ({
        ...s,
        activeScreen: 'live',
        matches: s.matches.map((m) => (m.id === matchId ? { ...m, ...patch } : m)),
        liveMatchState: { ...s.liveMatchState, matchId, goalEvents: [] },
      }))

      const tournamentId = get().tournament.id
      if (tournamentId) {
        updateMatch(tournamentId, matchId, { status: 'live', result_confirmed: false, winner_team_id: null }).catch((err) => {
          console.error(`Failed to persist start match for match ${matchId}:`, err)
        })
      }
    },

    endMatch: (matchId) => {
      setState((s) => {
        const nextMatches = s.matches.map((m) => (m.id === matchId ? { ...m, status: 'finished' } : m))
        const ended = s.matches.find((m) => m.id === matchId)
        const nextTimers = { ...s.matchTimers }
        delete nextTimers[matchId]
        return {
          ...s,
          matches: nextMatches,
          standings: ended?.mode === 'league' ? computeStandings(s.teams, nextMatches) : s.standings,
          matchTimers: nextTimers,
        }
      })

      const tournamentId = get().tournament.id
      if (tournamentId) {
        updateMatch(tournamentId, matchId, { status: 'finished' }).catch((err) => {
          console.error(`Failed to persist end match for match ${matchId}:`, err)
        })
      }
    },

    restartMatch: (matchId) => {
      const patch = { homeScore: 0, awayScore: 0, status: 'pending', winnerTeamId: null, resultConfirmed: false }

      setState((s) => {
        const nextMatches = s.matches.map((m) => (m.id === matchId ? { ...m, ...patch } : m))
        const restarted = s.matches.find((m) => m.id === matchId)
        const nextTimers = { ...s.matchTimers }
        delete nextTimers[matchId]
        return {
          ...s,
          matches: nextMatches,
          standings: restarted?.mode === 'league' ? computeStandings(s.teams, nextMatches) : s.standings,
          liveMatchState: s.liveMatchState.matchId === matchId ? { ...s.liveMatchState, matchId: null, goalEvents: [] } : s.liveMatchState,
          matchTimers: nextTimers,
        }
      })

      const tournamentId = get().tournament.id
      if (tournamentId) {
        updateMatch(tournamentId, matchId, {
          home_score: 0,
          away_score: 0,
          status: 'pending',
          winner_team_id: null,
          result_confirmed: false,
        }).catch((err) => {
          console.error(`Failed to persist restart match for match ${matchId}:`, err)
        })
      }
    },

    incrementHomeScore: (matchId) => {
      const state = get()
      const match = state.matches.find((m) => m.id === matchId)
      if (!match) return
      if (match.status !== 'live') throw new Error('ابدأ المباراة أولا')

      const patch = { homeScore: (match.homeScore ?? 0) + 1 }

      setState((s) => {
        const nextMatches = s.matches.map((m) => (m.id === matchId ? { ...m, ...patch } : m))
        return {
          ...s,
          matches: nextMatches,
          standings: match.mode === 'league' ? computeStandings(s.teams, nextMatches) : s.standings,
          liveMatchState: {
            ...s.liveMatchState,
            goalEvents: [...s.liveMatchState.goalEvents, { id: crypto.randomUUID(), matchId, side: 'home', at: Date.now() }],
          },
        }
      })

      const tournamentId = get().tournament.id
      if (tournamentId) {
        updateMatch(tournamentId, matchId, { home_score: patch.homeScore }).catch((err) => {
          console.error(`Failed to persist home score for match ${matchId}:`, err)
        })
      }
    },

    incrementAwayScore: (matchId) => {
      const state = get()
      const match = state.matches.find((m) => m.id === matchId)
      if (!match) return
      if (match.status !== 'live') throw new Error('ابدأ المباراة أولا')

      const patch = { awayScore: (match.awayScore ?? 0) + 1 }

      setState((s) => {
        const nextMatches = s.matches.map((m) => (m.id === matchId ? { ...m, ...patch } : m))
        return {
          ...s,
          matches: nextMatches,
          standings: match.mode === 'league' ? computeStandings(s.teams, nextMatches) : s.standings,
          liveMatchState: {
            ...s.liveMatchState,
            goalEvents: [...s.liveMatchState.goalEvents, { id: crypto.randomUUID(), matchId, side: 'away', at: Date.now() }],
          },
        }
      })

      const tournamentId = get().tournament.id
      if (tournamentId) {
        updateMatch(tournamentId, matchId, { away_score: patch.awayScore }).catch((err) => {
          console.error(`Failed to persist away score for match ${matchId}:`, err)
        })
      }
    },

    undoGoal: (matchId) =>
      setState((s) => {
        const match = s.matches.find((m) => m.id === matchId)
        if (!match) return s
        const events = s.liveMatchState.goalEvents.slice()
        const lastIndex = [...events].reverse().findIndex((e) => e.matchId === matchId)
        if (lastIndex === -1) return s
        const idx = events.length - 1 - lastIndex
        const last = events[idx]
        events.splice(idx, 1)

        const nextMatches = s.matches.map((m) => {
          if (m.id !== matchId) return m
          if (last.side === 'home') return { ...m, homeScore: Math.max(0, (m.homeScore ?? 0) - 1) }
          return { ...m, awayScore: Math.max(0, (m.awayScore ?? 0) - 1) }
        })

        return {
          ...s,
          matches: nextMatches,
          standings: match.mode === 'league' ? computeStandings(s.teams, nextMatches) : s.standings,
          liveMatchState: { ...s.liveMatchState, goalEvents: events },
        }
      }),

    confirmResult: (matchId) => {
      const state = get()
      const match = state.matches.find((m) => m.id === matchId)
      if (!match) throw new Error('المباراة غير موجودة')

      let winnerTeamId = null
      if (match.mode === 'knockout') {
        const hs = Number(match.homeScore ?? 0)
        const as = Number(match.awayScore ?? 0)
        if (hs === as) throw new Error('لا يمكن تأكيد النتيجة في خروج مغلوب عند التعادل')
        winnerTeamId = hs > as ? match.homeTeamId : match.awayTeamId
        if (!winnerTeamId) throw new Error('لا يوجد فائز')
      }

      const patch = { status: 'finished', resultConfirmed: true, winnerTeamId }

      setState((s) => {
        const updatedMatches = s.matches.map((m) => (m.id === matchId ? { ...m, ...patch } : m))
        return { ...s, matches: updatedMatches, standings: computeStandings(s.teams, updatedMatches) }
      })

      const tournamentId = get().tournament.id
      const updatedMatch = get().matches.find(m => m.id === matchId)

      if (tournamentId && updatedMatch) {
        const payload = {
          home_score: updatedMatch.homeScore,
          away_score: updatedMatch.awayScore,
          status: updatedMatch.status,
          result_confirmed: updatedMatch.resultConfirmed,
          winner_team_id: updatedMatch.winnerTeamId,
        }
        updateMatch(tournamentId, matchId, payload).catch((err) => {
          console.error(`Failed to persist confirmed result for match ${matchId}:`, err)
        })
      }
    },

    setTimerDurationMinutes: (minutes, matchId) => {
      const scopedMatchId = getScopedMatchId(matchId)
      if (!scopedMatchId) return
      const tournamentId = getActiveTournamentId()
      if (!tournamentId) return
      const durationMs = Math.max(1, Number(minutes) || 10) * 60 * 1000
      updateMatchTimerLocal(scopedMatchId, {
        durationMs,
        remainingMs: durationMs,
        status: 'paused',
      })
      void setMatchTimerDuration({ tournamentId, matchId: scopedMatchId, durationMs }).catch(() => null)
    },

    startTimer: (matchId) => {
      const scopedMatchId = getScopedMatchId(matchId)
      if (!scopedMatchId) throw new Error('اختر مباراة أولا')
      const tournamentId = getActiveTournamentId()
      if (!tournamentId) throw new Error('لا يوجد Tournament ID صالح')
      const current = get().matchTimers[scopedMatchId]
      const durationMs = Math.max(1, Number(current?.durationMs ?? DEFAULT_TIMER_DURATION_MS))
      const currentRemaining = Math.max(0, getEffectiveRemainingMs(current))
      const remainingMs = currentRemaining > 0 ? currentRemaining : durationMs
      updateMatchTimerLocal(scopedMatchId, { durationMs, remainingMs, status: 'running' })
      void startMatchTimer({ tournamentId, matchId: scopedMatchId, durationMs }).catch(() => null)
    },

    pauseTimer: (matchId) => {
      const scopedMatchId = getScopedMatchId(matchId)
      if (!scopedMatchId) throw new Error('اختر مباراة أولا')
      const tournamentId = getActiveTournamentId()
      if (!tournamentId) throw new Error('لا يوجد Tournament ID صالح')
      const current = get().matchTimers[scopedMatchId]
      const remainingMs = Math.max(0, getEffectiveRemainingMs(current))
      updateMatchTimerLocal(scopedMatchId, { remainingMs, status: 'paused' })
      void pauseMatchTimer({ tournamentId, matchId: scopedMatchId }).catch(() => null)
    },

    resumeTimer: (matchId) => {
      const scopedMatchId = getScopedMatchId(matchId)
      if (!scopedMatchId) throw new Error('اختر مباراة أولا')
      const tournamentId = getActiveTournamentId()
      if (!tournamentId) throw new Error('لا يوجد Tournament ID صالح')
      const current = get().matchTimers[scopedMatchId]
      const remainingMs = Math.max(0, getEffectiveRemainingMs(current))
      updateMatchTimerLocal(scopedMatchId, { remainingMs, status: 'running' })
      void resumeMatchTimer({ tournamentId, matchId: scopedMatchId }).catch(() => null)
    },

    resetTimer: (matchId) => {
      const scopedMatchId = getScopedMatchId(matchId)
      if (!scopedMatchId) throw new Error('اختر مباراة أولا')
      const tournamentId = getActiveTournamentId()
      if (!tournamentId) throw new Error('لا يوجد Tournament ID صالح')
      set((state) => {
        const next = { ...state.matchTimers }
        delete next[scopedMatchId]
        return { ...state, matchTimers: next }
      })
      void clearMatchTimer({ tournamentId, matchId: scopedMatchId }).catch(() => null)
    },

    adjustTimerSeconds: (deltaSeconds, matchId) => {
      const scopedMatchId = getScopedMatchId(matchId)
      if (!scopedMatchId) throw new Error('اختر مباراة أولا')
      const tournamentId = getActiveTournamentId()
      if (!tournamentId) throw new Error('لا يوجد Tournament ID صالح')
      const deltaMs = (Number(deltaSeconds) || 0) * 1000
      if (!Number.isFinite(deltaMs) || deltaMs === 0) return
      const current = get().matchTimers[scopedMatchId]
      const nextDuration = Math.max(0, Number(current?.durationMs ?? DEFAULT_TIMER_DURATION_MS) + deltaMs)
      const liveRemaining = Math.max(0, getEffectiveRemainingMs(current))
      updateMatchTimerLocal(scopedMatchId, {
        durationMs: nextDuration,
        remainingMs: Math.max(0, liveRemaining + deltaMs),
      })
      void adjustMatchTimer({ tournamentId, matchId: scopedMatchId, deltaMs }).catch(() => null)
    },

    clearMatchTimer: (matchId) => {
      const scopedMatchId = getScopedMatchId(matchId)
      if (!scopedMatchId) throw new Error('اختر مباراة أولا')
      const tournamentId = getActiveTournamentId()
      if (!tournamentId) throw new Error('لا يوجد Tournament ID صالح')
      set((state) => {
        const next = { ...state.matchTimers }
        delete next[scopedMatchId]
        return { ...state, matchTimers: next }
      })
      void clearMatchTimer({ tournamentId, matchId: scopedMatchId }).catch(() => null)
    },

    setActiveScreen: (screen) => {
      try {
        liveBroadcastChannel?.postMessage({
          type: 'SCREEN_CHANGE',
          screen,
          timestamp: Date.now(),
        })
      } catch {
        // ignore
      }
      setState({ activeScreen: screen })
    },
    setSponsorUrls: (urls) =>
      setState((s) => ({
        ...s,
        sponsor: {
          ...s.sponsor,
          urls: (Array.isArray(urls) ? urls : []).map((item) => String(item || '').trim()).filter(Boolean),
        },
      })),

    setTeams: (teams) => setState({ teams }),
    setMatches: (matches) => setState({ matches: sortMatchesByDate(matches) }),
    setStandings: (standings) => setState({ standings }),
    setLiveMatchState: (liveMatchState) => setState({ liveMatchState }),
    setMatchTimers: (matchTimers) => setState((s) => ({ ...s, matchTimers: normalizeMatchTimers(matchTimers) })),

    exportJSON: () => {
      const snapshot = persistedSlice(get())
      return JSON.stringify({ version: 2, exportedAt: Date.now(), data: snapshot }, null, 2)
    },

    importJSON: async (jsonString) => {
      const parsed = JSON.parse(jsonString)
      const data = parsed?.data
      if (!data) throw new Error('Invalid backup file')
      const normalizedData = {
        ...data,
        sponsor: normalizeSponsor(data.sponsor),
        matchTimers: normalizeMatchTimers(data.matchTimers),
      }

      set(() => ({ ...defaultState(), ...normalizedData, _meta: { ...get()._meta, hydrated: true } }))
      await commit({ ...get(), ...normalizedData })
    },

    resetAll: async () => {
      const initial = defaultState()
      set(() => initial)
      await commit(initial)
    },
  }
})



