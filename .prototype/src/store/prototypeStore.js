import { create } from 'zustand'
import { INITIAL_DEMO_DATA } from '../mock/mockData'

const STORAGE_KEY = 'fifa_prototype_db_v1'

let channel = null
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    channel = new BroadcastChannel('fifa_prototype_sync')
  }
} catch {
  // ignore
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // fallback
  }
  return INITIAL_DEMO_DATA
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // ignore
  }
}

export const usePrototypeStore = create((set, get) => {
  const initial = loadState()

  // Setup broadcast sync
  if (channel) {
    channel.onmessage = (event) => {
      if (event.data?.type === 'SYNC_STATE' && event.data?.payload) {
        set(event.data.payload)
      }
    }
  }

  const broadcast = (nextState) => {
    saveState(nextState)
    try {
      channel?.postMessage({ type: 'SYNC_STATE', payload: nextState })
    } catch {
      // ignore
    }
  }

  return {
    ...initial,

    setActiveScreen: (screen) => {
      set((state) => {
        const next = { ...state, activeScreen: screen }
        broadcast(next)
        return next
      })
    },

    setLiveMatchId: (id) => {
      set((state) => {
        const next = { ...state, liveMatchId: id }
        broadcast(next)
        return next
      })
    },

    incrementHomeScore: (matchId) => {
      set((state) => {
        const nextMatches = state.matches.map((m) =>
          m.id === matchId ? { ...m, home_score: (m.home_score || 0) + 1 } : m
        )
        const next = { ...state, matches: nextMatches }
        broadcast(next)
        return next
      })
    },

    incrementAwayScore: (matchId) => {
      set((state) => {
        const nextMatches = state.matches.map((m) =>
          m.id === matchId ? { ...m, away_score: (m.away_score || 0) + 1 } : m
        )
        const next = { ...state, matches: nextMatches }
        broadcast(next)
        return next
      })
    },

    undoGoal: (matchId) => {
      set((state) => {
        const nextMatches = state.matches.map((m) => {
          if (m.id !== matchId) return m
          return {
            ...m,
            home_score: Math.max(0, (m.home_score || 0) - 1),
          }
        })
        const next = { ...state, matches: nextMatches }
        broadcast(next)
        return next
      })
    },

    startMatch: (matchId) => {
      set((state) => {
        const nextMatches = state.matches.map((m) =>
          m.id === matchId ? { ...m, status: 'live', timer_running: true } : m
        )
        const next = { ...state, matches: nextMatches, liveMatchId: matchId, activeScreen: 'live' }
        broadcast(next)
        return next
      })
    },

    endMatch: (matchId) => {
      set((state) => {
        const nextMatches = state.matches.map((m) =>
          m.id === matchId ? { ...m, status: 'finished', timer_running: false } : m
        )
        const next = { ...state, matches: nextMatches }
        broadcast(next)
        return next
      })
    },

    confirmResult: (matchId) => {
      set((state) => {
        const target = state.matches.find((m) => m.id === matchId)
        if (!target) return state

        // Update standings automatically
        const nextStandings = state.standings.map((row) => {
          if (row.teamId === target.home_team_id) {
            const won = target.home_score > target.away_score
            const drawn = target.home_score === target.away_score
            return {
              ...row,
              played: row.played + 1,
              won: row.won + (won ? 1 : 0),
              drawn: row.drawn + (drawn ? 1 : 0),
              lost: row.lost + (!won && !drawn ? 1 : 0),
              gf: row.gf + target.home_score,
              ga: row.ga + target.away_score,
              gd: row.gd + (target.home_score - target.away_score),
              points: row.points + (won ? 3 : drawn ? 1 : 0),
            }
          }
          if (row.teamId === target.away_team_id) {
            const won = target.away_score > target.home_score
            const drawn = target.home_score === target.away_score
            return {
              ...row,
              played: row.played + 1,
              won: row.won + (won ? 1 : 0),
              drawn: row.drawn + (drawn ? 1 : 0),
              lost: row.lost + (!won && !drawn ? 1 : 0),
              gf: row.gf + target.away_score,
              ga: row.ga + target.home_score,
              gd: row.gd + (target.away_score - target.home_score),
              points: row.points + (won ? 3 : drawn ? 1 : 0),
            }
          }
          return row
        })

        const nextMatches = state.matches.map((m) =>
          m.id === matchId ? { ...m, status: 'finished', result_confirmed: true } : m
        )

        const next = { ...state, matches: nextMatches, standings: nextStandings }
        broadcast(next)
        return next
      })
    },

    restartMatch: (matchId) => {
      set((state) => {
        const nextMatches = state.matches.map((m) =>
          m.id === matchId
            ? { ...m, home_score: 0, away_score: 0, status: 'scheduled', timer_seconds: 600, timer_running: false }
            : m
        )
        const next = { ...state, matches: nextMatches }
        broadcast(next)
        return next
      })
    },

    toggleTimer: (matchId) => {
      set((state) => {
        const nextMatches = state.matches.map((m) =>
          m.id === matchId ? { ...m, timer_running: !m.timer_running } : m
        )
        const next = { ...state, matches: nextMatches }
        broadcast(next)
        return next
      })
    },

    resetTimer: (matchId) => {
      set((state) => {
        const nextMatches = state.matches.map((m) =>
          m.id === matchId ? { ...m, timer_seconds: 600, timer_running: false } : m
        )
        const next = { ...state, matches: nextMatches }
        broadcast(next)
        return next
      })
    },

    adjustTimerSeconds: (matchId, delta) => {
      set((state) => {
        const nextMatches = state.matches.map((m) =>
          m.id === matchId ? { ...m, timer_seconds: Math.max(0, (m.timer_seconds || 0) + delta) } : m
        )
        const next = { ...state, matches: nextMatches }
        broadcast(next)
        return next
      })
    },

    setBranding: (brandingUpdates) => {
      set((state) => {
        const nextBranding = { ...state.branding, ...brandingUpdates }
        const next = { ...state, branding: nextBranding }
        const root = document.documentElement
        if (nextBranding.primary_color) root.style.setProperty('--primary-color', nextBranding.primary_color)
        if (nextBranding.secondary_color) root.style.setProperty('--secondary-color', nextBranding.secondary_color)
        broadcast(next)
        return next
      })
    },

    addExpense: (expense) => {
      set((state) => {
        const nextExpenses = [
          ...state.financials.expenses,
          { id: Date.now(), ...expense, date: new Date().toISOString().slice(0, 10) },
        ]
        const next = {
          ...state,
          financials: { ...state.financials, expenses: nextExpenses },
        }
        broadcast(next)
        return next
      })
    },

    deleteExpense: (id) => {
      set((state) => {
        const nextExpenses = state.financials.expenses.filter((e) => e.id !== id)
        const next = {
          ...state,
          financials: { ...state.financials, expenses: nextExpenses },
        }
        broadcast(next)
        return next
      })
    },

    toggleStation: (stationId) => {
      set((state) => {
        const nextStations = state.stations.map((s) => {
          if (s.id !== stationId) return s
          const nextStatus = s.status === 'busy' ? 'ready' : 'busy'
          return {
            ...s,
            status: nextStatus,
            elapsedSeconds: nextStatus === 'busy' ? 120 : 0,
            totalIncome: nextStatus === 'busy' ? s.totalIncome + 20 : s.totalIncome,
          }
        })
        const next = { ...state, stations: nextStations }
        broadcast(next)
        return next
      })
    },

    resetToDefaults: () => {
      localStorage.removeItem(STORAGE_KEY)
      set(INITIAL_DEMO_DATA)
      broadcast(INITIAL_DEMO_DATA)
    },
  }
})
