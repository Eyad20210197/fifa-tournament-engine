import { create } from 'zustand'
import { generateTournamentData } from '../utils/tournament/generate'
import { computeStandings } from '../utils/tournament/standings'
import { publishLiveState } from '../services/liveStateSocket'
import { saveCurrentLiveState } from '../services/liveStateService'

function normalizeTimer(timer) {
  const fallback = {
    durationMs: 10 * 60 * 1000,
    running: false,
    startedAt: null,
    accumulatedMs: 0,
  }

  if (!timer || typeof timer !== 'object') return fallback

  // ترقية من نسخة سابقة: remainingMs/lastTickAt
  if (timer.remainingMs !== undefined) {
    const durationMs = Number(timer.durationMs ?? fallback.durationMs)
    const remainingMs = Number(timer.remainingMs ?? durationMs)
    const accumulatedMs = Math.max(0, durationMs - remainingMs)
    return { durationMs, running: false, startedAt: null, accumulatedMs }
  }

  return {
    durationMs: Number(timer.durationMs ?? fallback.durationMs),
    running: Boolean(timer.running ?? false),
    startedAt: timer.startedAt ?? null,
    accumulatedMs: Number(timer.accumulatedMs ?? 0),
  }
}

export function computeRemainingMs(timer, now = Date.now()) {
  const t = normalizeTimer(timer)
  const elapsed = t.running && t.startedAt ? t.accumulatedMs + Math.max(0, now - t.startedAt) : t.accumulatedMs
  return Math.max(0, t.durationMs - elapsed)
}

function persistedSlice(state) {
  const { tournament, teams, matches, standings, activeScreen, sponsor, liveMatchState } = state
  return { tournament, teams, matches, standings, activeScreen, sponsor, liveMatchState }
}

function defaultTournament() {
  return {
    name: 'بطولة رمضان 2026',
    format: 'دوري', // دوري | خروج مغلوب
  }
}

function defaultState() {
  return {
    tournament: defaultTournament(),
    teams: [],
    matches: [],
    standings: [],
    activeScreen: 'opening', // opening | live | standings | bracket | schedule
    sponsor: {
      logoBase64: null,
    },
    liveMatchState: {
      matchId: null,
      timer: {
        durationMs: 10 * 60 * 1000,
        running: false,
        startedAt: null,
        accumulatedMs: 0,
      },
      goalEvents: [],
    },
    _meta: {
      hydrated: true,
      lastSavedAt: null,
      lastReceivedAt: null,
      syncEnabled: false,
    },
  }
}

export const useTournamentStore = create((set, get) => {
  let isApplyingRemote = false
  let commitQueue = Promise.resolve()

  async function commit(nextState, { broadcast = true } = {}) {
    const snapshot = persistedSlice(nextState)

    // تسلسل الحفظ لتفادي تداخل المعاملات
    commitQueue = commitQueue
      .then(async () => {
        await saveCurrentLiveState(snapshot).catch(() => null)
        set((s) => ({ _meta: { ...s._meta, lastSavedAt: Date.now() } }))

        // بث التحديث بعد نجاح الحفظ فقط لتغذية شاشة العرض الحية عبر WebSocket.
        if (broadcast && !isApplyingRemote) {
          publishLiveState(snapshot)
        }
      })
      .catch((err) => {
        console.error('فشل حفظ حالة البث على الخادم:', err)
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

  async function hydrate() {
    set((s) => ({ ...s, _meta: { ...s._meta, hydrated: true } }))
  }

  return {
    ...defaultState(),

    // Bootstrap
    hydrate,

    // تطبيق حالة واردة من الخادم/الـ WebSocket بدون إعادة حفظ لتفادي الحلقات.
    applyRemoteState: (payload) => {
      if (!payload) return
      isApplyingRemote = true
      try {
        set((s) => ({
          ...s,
          ...payload,
          liveMatchState: payload.liveMatchState
            ? {
                ...payload.liveMatchState,
                timer: normalizeTimer(payload.liveMatchState.timer),
                goalEvents: Array.isArray(payload.liveMatchState.goalEvents) ? payload.liveMatchState.goalEvents : [],
              }
            : s.liveMatchState,
          _meta: { ...s._meta, lastReceivedAt: Date.now(), syncEnabled: true, hydrated: true },
        }))
      } finally {
        isApplyingRemote = false
      }
    },

    // Tournament basics
    setTournament: (partial) =>
      setState((s) => ({ ...s, tournament: { ...s.tournament, ...partial } })),

    // Teams (Phase 2)
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

    // Tournament generator (Phase 3)
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
          liveMatchState: {
            ...s.liveMatchState,
            matchId: null,
            goalEvents: [],
            timer: {
              ...normalizeTimer(s.liveMatchState.timer),
              running: false,
              startedAt: null,
              accumulatedMs: 0,
            },
          },
        }
      }),
    recalcStandings: () =>
      setState((s) => ({
        ...s,
        standings: computeStandings(s.teams, s.matches),
      })),

    // Live match selection (Phase 4)
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

      setState((s) => {
        const timer = normalizeTimer(s.liveMatchState.timer)
        return {
          ...s,
          activeScreen: 'live',
          matches: s.matches.map((m) => {
            if (m.id === matchId) return { ...m, status: 'live' }
            if (m.status === 'live') return { ...m, status: 'pending' }
            return m
          }),
          liveMatchState: {
            ...s.liveMatchState,
            matchId,
            goalEvents: [],
            timer: {
              ...timer,
              running: false,
              startedAt: null,
              accumulatedMs: timer.accumulatedMs ?? 0,
            },
          },
        }
      })
    },

    endMatch: (matchId) =>
      setState((s) => {
        const nextMatches = s.matches.map((m) => (m.id === matchId ? { ...m, status: 'finished' } : m))
        const ended = s.matches.find((m) => m.id === matchId)
        return {
          ...s,
          matches: nextMatches,
          standings: ended?.mode === 'league' ? computeStandings(s.teams, nextMatches) : s.standings,
          liveMatchState: {
            ...s.liveMatchState,
            timer: (() => {
              const t = normalizeTimer(s.liveMatchState.timer)
              if (!t.running) return t
              const accumulatedMs = t.accumulatedMs + Math.max(0, Date.now() - (t.startedAt || Date.now()))
              return { ...t, running: false, startedAt: null, accumulatedMs }
            })(),
          },
        }
      }),

    restartMatch: (matchId) =>
      setState((s) => {
        const nextMatches = s.matches.map((m) =>
          m.id === matchId
            ? {
                ...m,
                homeScore: 0,
                awayScore: 0,
                status: 'pending',
                winnerTeamId: null,
                resultConfirmed: false,
              }
            : m,
        )
        const restarted = s.matches.find((m) => m.id === matchId)
        return {
          ...s,
          matches: nextMatches,
          standings: restarted?.mode === 'league' ? computeStandings(s.teams, nextMatches) : s.standings,
          liveMatchState:
            s.liveMatchState.matchId === matchId
              ? {
                  ...s.liveMatchState,
                  matchId: null,
                  goalEvents: [],
                  timer: { ...normalizeTimer(s.liveMatchState.timer), running: false, startedAt: null, accumulatedMs: 0 },
                }
              : s.liveMatchState,
        }
      }),

    incrementHomeScore: (matchId) =>
      setState((s) => {
        const match = s.matches.find((m) => m.id === matchId)
        if (!match) return s
        if (match.status !== 'live') throw new Error('ابدأ المباراة أولاً')
        const nextMatches = s.matches.map((m) => (m.id === matchId ? { ...m, homeScore: (m.homeScore ?? 0) + 1 } : m))
        return {
          ...s,
          matches: nextMatches,
          standings: match.mode === 'league' ? computeStandings(s.teams, nextMatches) : s.standings,
          liveMatchState: {
            ...s.liveMatchState,
            goalEvents: [
              ...s.liveMatchState.goalEvents,
              { id: crypto.randomUUID(), matchId, side: 'home', at: Date.now() },
            ],
          },
        }
      }),

    incrementAwayScore: (matchId) =>
      setState((s) => {
        const match = s.matches.find((m) => m.id === matchId)
        if (!match) return s
        if (match.status !== 'live') throw new Error('ابدأ المباراة أولاً')
        const nextMatches = s.matches.map((m) => (m.id === matchId ? { ...m, awayScore: (m.awayScore ?? 0) + 1 } : m))
        return {
          ...s,
          matches: nextMatches,
          standings: match.mode === 'league' ? computeStandings(s.teams, nextMatches) : s.standings,
          liveMatchState: {
            ...s.liveMatchState,
            goalEvents: [
              ...s.liveMatchState.goalEvents,
              { id: crypto.randomUUID(), matchId, side: 'away', at: Date.now() },
            ],
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

        setState((s) => {
          const nextMatches = s.matches.map((m) => {
            if (m.id === matchId) {
              return { ...m, status: 'finished', winnerTeamId, resultConfirmed: true }
            }
            if (m.id === match.nextMatchId && match.nextSlot) {
              const patch = match.nextSlot === 'home' ? { homeTeamId: winnerTeamId } : { awayTeamId: winnerTeamId }
              const updated = { ...m, ...patch }
              // إذا اكتمل الطرفين، اترك الحالة pending حتى يبدأها المشغّل
              if (updated.homeTeamId && updated.awayTeamId && updated.status === 'finished' && updated.winnerTeamId) {
                return updated
              }
              if (updated.homeTeamId && updated.awayTeamId && updated.status === 'pending') return updated
              return updated
            }
            return m
          })

          return { ...s, matches: nextMatches }
        })
        return
      }

      // دوري: تثبيت المباراة ثم إعادة حساب الترتيب
      setState((s) => {
        const updatedMatches = s.matches.map((m) =>
          m.id === matchId ? { ...m, status: 'finished', resultConfirmed: true } : m,
        )
        return {
          ...s,
          matches: updatedMatches,
          standings: computeStandings(s.teams, updatedMatches),
        }
      })
    },

    // Timer (Phase 4)
    setTimerDurationMinutes: (minutes) =>
      setState((s) => {
        const mins = Math.max(1, Number(minutes) || 10)
        return {
          ...s,
          liveMatchState: {
            ...s.liveMatchState,
            timer: { durationMs: mins * 60 * 1000, running: false, startedAt: null, accumulatedMs: 0 },
          },
        }
      }),

    startTimer: () =>
      setState((s) => {
        const t = normalizeTimer(s.liveMatchState.timer)
        if (t.running) return s
        const remaining = computeRemainingMs(t, Date.now())
        if (remaining <= 0) return s
        return {
          ...s,
          liveMatchState: {
            ...s.liveMatchState,
            timer: { ...t, running: true, startedAt: Date.now() },
          },
        }
      }),

    pauseTimer: () =>
      setState((s) => {
        const t = normalizeTimer(s.liveMatchState.timer)
        if (!t.running) return s
        const accumulatedMs = t.accumulatedMs + Math.max(0, Date.now() - (t.startedAt || Date.now()))
        return {
          ...s,
          liveMatchState: { ...s.liveMatchState, timer: { ...t, running: false, startedAt: null, accumulatedMs } },
        }
      }),

    resetTimer: () =>
      setState((s) => {
        const t = normalizeTimer(s.liveMatchState.timer)
        return {
          ...s,
          liveMatchState: { ...s.liveMatchState, timer: { ...t, running: false, startedAt: null, accumulatedMs: 0 } },
        }
      }),

    adjustTimerSeconds: (deltaSeconds) =>
      setState((s) => {
        const t = normalizeTimer(s.liveMatchState.timer)
        const deltaMs = (Number(deltaSeconds) || 0) * 1000
        const nextDuration = Math.max(0, t.durationMs + deltaMs)
        return {
          ...s,
          liveMatchState: { ...s.liveMatchState, timer: { ...t, durationMs: nextDuration } },
        }
      }),

    // Display controls
    setActiveScreen: (screen) => setState({ activeScreen: screen }),
    setSponsorLogo: (logoBase64) => setState((s) => ({ ...s, sponsor: { ...s.sponsor, logoBase64 } })),

    // Bulk setters (Phase 3 will generate them)
    setTeams: (teams) => setState({ teams }),
    setMatches: (matches) => setState({ matches }),
    setStandings: (standings) => setState({ standings }),
    setLiveMatchState: (liveMatchState) => setState({ liveMatchState }),

    // Backup (يُستخدم في لوحة التحكم لاحقاً)
    exportJSON: () => {
      const snapshot = persistedSlice(get())
      return JSON.stringify({ version: 1, exportedAt: Date.now(), data: snapshot }, null, 2)
    },
    importJSON: async (jsonString) => {
      const parsed = JSON.parse(jsonString)
      const data = parsed?.data
      if (!data) throw new Error('ملف النسخة الاحتياطية غير صالح')

      isApplyingRemote = true
      try {
        set(() => ({ ...defaultState(), ...data, _meta: { ...get()._meta, hydrated: true } }))
        await commit({ ...get(), ...data }, { broadcast: true })
      } finally {
        isApplyingRemote = false
      }
    },

    // Factory reset
    resetAll: async () => {
      const initial = defaultState()
      set(() => initial)
      await commit(initial, { broadcast: true })
    },
  }
})
