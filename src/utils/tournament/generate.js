import { generateRoundRobinMatches } from './roundRobin'
import { generateKnockoutMatches } from './knockout'
import { buildInitialStandings } from './standings'

export function generateTournamentData({ teams, format }) {
  if (!Array.isArray(teams) || teams.length < 2) {
    return { matches: [], standings: [] }
  }

  if (format === 'خروج مغلوب') {
    return {
      matches: generateKnockoutMatches(teams),
      standings: [],
    }
  }

  // default: دوري
  return {
    matches: generateRoundRobinMatches(teams),
    standings: buildInitialStandings(teams),
  }
}

