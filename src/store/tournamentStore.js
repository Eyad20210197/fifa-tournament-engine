import { create } from 'zustand'
import { generateTournamentData } from '../utils/tournament/generate'
import { computeStandings } from '../utils/tournament/standings'
import { publishLiveState, wsAdjustMatchTimer, wsClearMatchTimer, wsPauseMatchTimer, wsResumeMatchTimer, wsSetMatchTimerDuration, wsStartMatchTimer } from '../services/liveStateSocket'
import { saveCurrentLiveState } from '../services/liveStateService'

const DEFAULT_TIMER_DURATION_MS = 10 * 60 * 1000

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
  for (const [rawMatchId, value] of Object.entries(input)) {
    const matchId = Number(rawMatchId)
    if (!Number.isFinite(matchId) || matchId <= 0 || !value || typeof value !== 'object') continue
    output[matchId] = {
      remainingMs: Math.max(0, Number(value.remainingMs ?? DEFAULT_TIMER_DURATION_MS)),
      durationMs: Math.max(1, Number(value.durationMs ?? DEFAULT_TIMER_DURATION_MS)),
      status: ['running', 'paused', 'finished'].includes(String(value.status)) ? String(value.status) : 'paused',
    }
  }
  return output
}

function isLikelyIncompleteLiveSnapshot(payload) {
  if (!payload || typeof payload !== 'object') return false
  const teamsEmpty = Array.isArray(payload.teams) && payload.teams.length === 0
  const matchesEmpty = Array.isArray(payload.matches) && payload.matches.length === 0
  if (!teamsEmpty && !matchesEmpty) return false
  const hasLiveMatch = payload?.liveMatchState?.matchId != null
  const activeScreen = payload?.activeScreen
  return Boolean(hasLiveMatch || (activeScreen && activeScreen !== 'opening'))
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
    name: 'بطولة رمضان 2026',
    format: 'دوري',
  }
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

export const useTournamentStore = create((set, get) => {
  let isApplyingRemote = false
  let commitQueue = Promise.resolve()

  async function commit(nextState, { broadcast = true } = {}) {
    const snapshot = persistedSlice(nextState)

    commitQueue = commitQueue
      .then(async () => {
        await saveCurrentLiveState(snapshot).catch(() => null)
        set((s) => ({ _meta: { ...s._meta, lastSavedAt: Date.now() } }))
        if (broadcast && !isApplyingRemote) {
          publishLiveState(snapshot)
        }
      })
      .catch((err) => {
        console.error('Failed to persist live snapshot:', err)
      })
  }

  function setState(mutator, { broadcast = true } = {}) {
    set((state) => {
      const next = typeof mutator === 'function' ? mutator(state) : { ...state, ...mutator }
      queueMicrotask(() => {
        void commit(get(), { broadcast })
      })
      return next
    })
  }

  function getScopedMatchId(matchId) {
    if (Number.isFinite(Number(matchId)) && Number(matchId) > 0) return Number(matchId)
    const selected = Number(get().liveMatchState.matchId)
    return Number.isFinite(selected) && selected > 0 ? selected : null
  }

  function updateMatchTimerLocal(matchId, patch) {
    const id = Number(matchId)
    if (!Number.isFinite(id) || id <= 0) return
    set((state) => {
      const current = state.matchTimers[id] || {
        remainingMs: DEFAULT_TIMER_DURATION_MS,
        durationMs: DEFAULT_TIMER_DURATION_MS,
        status: 'paused',
      }
      const next = { ...current, ...patch }
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
      isApplyingRemote = true
      try {
        set((s) => ({
          ...s,
          ...payload,
          ...mergedCollections(s, payload),
          sponsor: payload.sponsor ? normalizeSponsor(payload.sponsor) : s.sponsor,
          matchTimers: payload.matchTimers ? normalizeMatchTimers(payload.matchTimers) : s.matchTimers,
          liveMatchState: payload.liveMatchState
            ? {
                matchId: payload.liveMatchState.matchId ?? s.liveMatchState.matchId,
                goalEvents: Array.isArray(payload.liveMatchState.goalEvents) ? payload.liveMatchState.goalEvents : s.liveMatchState.goalEvents,
              }
            : s.liveMatchState,
          _meta: { ...s._meta, lastReceivedAt: Date.now(), syncEnabled: true, hydrated: true },
        }))
      } finally {
        isApplyingRemote = false
      }
    },

    applyMatchTimerUpdate: ({ matchId, remainingMs, status, durationMs }) => {
      const id = Number(matchId)
      if (!Number.isFinite(id) || id <= 0) return
      set((state) => {
        const current = state.matchTimers[id] || {
          remainingMs: DEFAULT_TIMER_DURATION_MS,
          durationMs: DEFAULT_TIMER_DURATION_MS,
          status: 'paused',
        }
        const nextRemaining = Math.max(0, Number(remainingMs ?? current.remainingMs))
        const nextDuration = Math.max(1, Number(durationMs ?? current.durationMs))
        return {
          ...state,
          matchTimers: {
            ...state.matchTimers,
            [id]: {
              remainingMs: nextRemaining,
              durationMs: nextDuration,
              status: statusForRemaining(nextRemaining, status || current.status),
            },
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
        const { matches, standings } = generateTournamentData({ teams: s.teams, format: nextFormat })
        const nextStandings = nextFormat === 'دوري' ? computeStandings(s.teams, matches) : standings
        return {
          ...s,
          tournament: { ...s.tournament, format: nextFormat },
          matches,
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

      setState((s) => ({
        ...s,
        activeScreen: 'live',
        matches: s.matches.map((m) => (m.id === matchId ? { ...m, status: 'live' } : m)),
        liveMatchState: { ...s.liveMatchState, matchId, goalEvents: [] },
      }))
    },

    endMatch: (matchId) =>
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
      }),

    restartMatch: (matchId) =>
      setState((s) => {
        const nextMatches = s.matches.map((m) =>
          m.id === matchId
            ? { ...m, homeScore: 0, awayScore: 0, status: 'pending', winnerTeamId: null, resultConfirmed: false }
            : m,
        )
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
      }),

    incrementHomeScore: (matchId) =>
      setState((s) => {
        const match = s.matches.find((m) => m.id === matchId)
        if (!match) return s
        if (match.status !== 'live') throw new Error('ابدأ المباراة أولا')
        const nextMatches = s.matches.map((m) => (m.id === matchId ? { ...m, homeScore: (m.homeScore ?? 0) + 1 } : m))
        return {
          ...s,
          matches: nextMatches,
          standings: match.mode === 'league' ? computeStandings(s.teams, nextMatches) : s.standings,
          liveMatchState: {
            ...s.liveMatchState,
            goalEvents: [...s.liveMatchState.goalEvents, { id: crypto.randomUUID(), matchId, side: 'home', at: Date.now() }],
          },
        }
      }),

    incrementAwayScore: (matchId) =>
      setState((s) => {
        const match = s.matches.find((m) => m.id === matchId)
        if (!match) return s
        if (match.status !== 'live') throw new Error('ابدأ المباراة أولا')
        const nextMatches = s.matches.map((m) => (m.id === matchId ? { ...m, awayScore: (m.awayScore ?? 0) + 1 } : m))
        return {
          ...s,
          matches: nextMatches,
          standings: match.mode === 'league' ? computeStandings(s.teams, nextMatches) : s.standings,
          liveMatchState: {
            ...s.liveMatchState,
            goalEvents: [...s.liveMatchState.goalEvents, { id: crypto.randomUUID(), matchId, side: 'away', at: Date.now() }],
          },
        }
      }),

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

      if (match.mode === 'knockout') {
        const hs = Number(match.homeScore ?? 0)
        const as = Number(match.awayScore ?? 0)
        if (hs === as) throw new Error('لا يمكن تأكيد النتيجة في خروج مغلوب عند التعادل')
        const winnerTeamId = hs > as ? match.homeTeamId : match.awayTeamId
        if (!winnerTeamId) throw new Error('لا يوجد فائز')
        setState((s) => ({
          ...s,
          matches: s.matches.map((m) => (m.id === matchId ? { ...m, status: 'finished', winnerTeamId, resultConfirmed: true } : m)),
        }))
        return
      }

      setState((s) => {
        const updatedMatches = s.matches.map((m) => (m.id === matchId ? { ...m, status: 'finished', resultConfirmed: true } : m))
        return { ...s, matches: updatedMatches, standings: computeStandings(s.teams, updatedMatches) }
      })
    },

    setTimerDurationMinutes: (minutes, matchId) => {
      const scopedMatchId = getScopedMatchId(matchId)
      if (!scopedMatchId) return
      const durationMs = Math.max(1, Number(minutes) || 10) * 60 * 1000
      updateMatchTimerLocal(scopedMatchId, {
        durationMs,
        remainingMs: durationMs,
        status: 'paused',
      })
      wsSetMatchTimerDuration(scopedMatchId, durationMs)
    },

    startTimer: (matchId) => {
      const scopedMatchId = getScopedMatchId(matchId)
      if (!scopedMatchId) return
      const current = get().matchTimers[scopedMatchId]
      const durationMs = Math.max(1, Number(current?.durationMs ?? DEFAULT_TIMER_DURATION_MS))
      updateMatchTimerLocal(scopedMatchId, { durationMs, status: 'running' })
      wsStartMatchTimer(scopedMatchId, durationMs)
    },

    pauseTimer: (matchId) => {
      const scopedMatchId = getScopedMatchId(matchId)
      if (!scopedMatchId) return
      updateMatchTimerLocal(scopedMatchId, { status: 'paused' })
      wsPauseMatchTimer(scopedMatchId)
    },

    resumeTimer: (matchId) => {
      const scopedMatchId = getScopedMatchId(matchId)
      if (!scopedMatchId) return
      updateMatchTimerLocal(scopedMatchId, { status: 'running' })
      wsResumeMatchTimer(scopedMatchId)
    },

    resetTimer: (matchId) => {
      const scopedMatchId = getScopedMatchId(matchId)
      if (!scopedMatchId) return
      set((state) => {
        const next = { ...state.matchTimers }
        delete next[scopedMatchId]
        return { ...state, matchTimers: next }
      })
      wsClearMatchTimer(scopedMatchId)
    },

    adjustTimerSeconds: (deltaSeconds, matchId) => {
      const scopedMatchId = getScopedMatchId(matchId)
      if (!scopedMatchId) return
      const deltaMs = (Number(deltaSeconds) || 0) * 1000
      if (!Number.isFinite(deltaMs) || deltaMs === 0) return
      const current = get().matchTimers[scopedMatchId]
      const nextDuration = Math.max(0, Number(current?.durationMs ?? DEFAULT_TIMER_DURATION_MS) + deltaMs)
      updateMatchTimerLocal(scopedMatchId, {
        durationMs: nextDuration,
        remainingMs: Math.max(0, Number(current?.remainingMs ?? nextDuration) + deltaMs),
      })
      wsAdjustMatchTimer(scopedMatchId, deltaMs)
    },

    clearMatchTimer: (matchId) => {
      const scopedMatchId = getScopedMatchId(matchId)
      if (!scopedMatchId) return
      set((state) => {
        const next = { ...state.matchTimers }
        delete next[scopedMatchId]
        return { ...state, matchTimers: next }
      })
      wsClearMatchTimer(scopedMatchId)
    },

    setActiveScreen: (screen) => setState({ activeScreen: screen }),
    setSponsorUrls: (urls) =>
      setState((s) => ({
        ...s,
        sponsor: {
          ...s.sponsor,
          urls: (Array.isArray(urls) ? urls : []).map((item) => String(item || '').trim()).filter(Boolean),
        },
      })),

    setTeams: (teams) => setState({ teams }),
    setMatches: (matches) => setState({ matches }),
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

      isApplyingRemote = true
      try {
        set(() => ({ ...defaultState(), ...normalizedData, _meta: { ...get()._meta, hydrated: true } }))
        await commit({ ...get(), ...normalizedData }, { broadcast: true })
      } finally {
        isApplyingRemote = false
      }
    },

    resetAll: async () => {
      const initial = defaultState()
      set(() => initial)
      await commit(initial, { broadcast: true })
    },
  }
})
