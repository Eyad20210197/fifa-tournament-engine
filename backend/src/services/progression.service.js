import { HttpError } from '../utils/httpError.js'
import { logger } from '../utils/logger.js'

const FORMAT_KNOCKOUT = 'knockout'
const FORMAT_ROUND_ROBIN = 'round_robin'
const FORMAT_HYBRID = 'hybrid'

function normalizeFormat(value) {
  const raw = String(value || '').trim().toLowerCase()
  if (raw === FORMAT_KNOCKOUT || raw === 'خروج مغلوب') return FORMAT_KNOCKOUT
  if (raw === FORMAT_HYBRID) return FORMAT_HYBRID
  return FORMAT_ROUND_ROBIN
}

function mapTournamentStatus(status) {
  const raw = String(status || '').trim().toLowerCase()
  if (raw === 'finished') return 'completed'
  if (raw === 'live' || raw === 'scheduled') return 'active'
  return 'draft'
}

function stableNumber(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function computeWinnerForMatch(match) {
  const explicitWinner = stableNumber(match?.winner_team_id, 0)
  if (explicitWinner > 0) return explicitWinner
  const homeTeam = stableNumber(match?.home_team_id, 0)
  const awayTeam = stableNumber(match?.away_team_id, 0)
  if (homeTeam > 0 && awayTeam <= 0) return homeTeam
  if (awayTeam > 0 && homeTeam <= 0) return awayTeam

  const homeScore = stableNumber(match?.home_score, 0)
  const awayScore = stableNumber(match?.away_score, 0)
  if (homeScore === awayScore) return null
  return homeScore > awayScore ? homeTeam || null : awayTeam || null
}

function pairKey(match) {
  const home = stableNumber(match?.home_team_id, 0)
  const away = stableNumber(match?.away_team_id, 0)
  const [a, b] = [home, away].sort((x, y) => x - y)
  return `${a}:${b}`
}

function extractWinnersFromKnockoutRound(matches) {
  const groups = new Map()
  for (const match of matches) {
    const key = pairKey(match)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(match)
  }

  const winners = []
  for (const entries of groups.values()) {
    const first = entries[0]
    const explicit = entries.find((item) => stableNumber(item.winner_team_id, 0) > 0)
    if (explicit) {
      winners.push(stableNumber(explicit.winner_team_id))
      continue
    }

    if (entries.length === 1) {
      const winner = computeWinnerForMatch(first)
      if (!winner) {
        throw new HttpError(400, `Cannot determine winner for match ${first.id}. Set winner_team_id for tie/manual override.`)
      }
      winners.push(winner)
      continue
    }

    const aggregate = new Map()
    for (const item of entries) {
      const home = stableNumber(item.home_team_id, 0)
      const away = stableNumber(item.away_team_id, 0)
      aggregate.set(home, stableNumber(aggregate.get(home), 0) + stableNumber(item.home_score, 0))
      aggregate.set(away, stableNumber(aggregate.get(away), 0) + stableNumber(item.away_score, 0))
    }
    const sorted = [...aggregate.entries()].sort((a, b) => b[1] - a[1])
    if (!sorted.length) {
      throw new HttpError(400, `Cannot determine winner for leg group containing match ${first.id}.`)
    }
    if (sorted.length > 1 && sorted[0][1] === sorted[1][1]) {
      throw new HttpError(400, `Aggregate tie for leg group containing match ${first.id}. Set winner_team_id manually.`)
    }
    winners.push(stableNumber(sorted[0][0]))
  }
  return winners
}

function buildRoundRobinStandings(teams, matches) {
  const table = new Map()
  for (const team of teams) {
    table.set(stableNumber(team.id), {
      teamId: stableNumber(team.id),
      points: 0,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDiff: 0,
    })
  }

  for (const match of matches) {
    if (!match?.result_confirmed) continue
    const homeId = stableNumber(match.home_team_id, 0)
    const awayId = stableNumber(match.away_team_id, 0)
    if (!homeId || !awayId) continue
    const home = table.get(homeId)
    const away = table.get(awayId)
    if (!home || !away) continue

    const homeScore = stableNumber(match.home_score, 0)
    const awayScore = stableNumber(match.away_score, 0)
    home.played += 1
    away.played += 1
    home.goalsFor += homeScore
    home.goalsAgainst += awayScore
    away.goalsFor += awayScore
    away.goalsAgainst += homeScore
    home.goalDiff = home.goalsFor - home.goalsAgainst
    away.goalDiff = away.goalsFor - away.goalsAgainst

    if (homeScore > awayScore) {
      home.wins += 1
      away.losses += 1
      home.points += 3
    } else if (awayScore > homeScore) {
      away.wins += 1
      home.losses += 1
      away.points += 3
    } else {
      home.draws += 1
      away.draws += 1
      home.points += 1
      away.points += 1
    }
  }

  return [...table.values()].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor
    return a.teamId - b.teamId
  })
}

export function isRoundComplete(matches, round, stage = 1) {
  const targetRound = stableNumber(round, 0)
  const targetStage = stableNumber(stage, 1)
  const roundMatches = (Array.isArray(matches) ? matches : []).filter(
    (m) => stableNumber(m.round_number, 0) === targetRound && stableNumber(m.stage_number, 1) === targetStage,
  )
  if (!roundMatches.length) return false
  return roundMatches.every((m) => Boolean(m.result_confirmed))
}

async function loadTournamentContext(client, businessId, tournamentId) {
  const tournamentResult = await client.query(
    `SELECT id, name, format, status, progression_format, current_stage, current_round, auto_advance, progression_locked, hybrid_qualifiers_count
     FROM tournaments
     WHERE id = $1 AND business_id = $2
     LIMIT 1`,
    [tournamentId, businessId],
  )
  const tournament = tournamentResult.rows[0]
  if (!tournament) throw new HttpError(404, 'Tournament not found')

  const matchesResult = await client.query(
    `SELECT id, home_team_id, away_team_id, home_score, away_score, status, round_number, stage_name, leg_number, starts_at,
            stage_number, result_confirmed, winner_team_id, manual_override
     FROM tournament_matches
     WHERE tournament_id = $1 AND business_id = $2
     ORDER BY stage_number ASC, round_number ASC, id ASC`,
    [tournamentId, businessId],
  )

  const teamsResult = await client.query(
    `SELECT id, team_name, club_name
     FROM tournament_teams
     WHERE tournament_id = $1 AND business_id = $2
     ORDER BY id ASC`,
    [tournamentId, businessId],
  )

  return { tournament, matches: matchesResult.rows, teams: teamsResult.rows }
}

function getEngineFormat(tournament) {
  return normalizeFormat(tournament?.progression_format || tournament?.format)
}

function getCurrentRoundMatches(matches, stage, round) {
  return (matches || []).filter(
    (match) => stableNumber(match.stage_number, 1) === stableNumber(stage, 1) && stableNumber(match.round_number, 0) === stableNumber(round, 0),
  )
}

function computeProgress({ matches, stage, round }) {
  const currentRoundMatches = getCurrentRoundMatches(matches, stage, round)
  const totalMatches = currentRoundMatches.length
  const completedMatches = currentRoundMatches.filter((m) => Boolean(m.result_confirmed)).length
  const progressPercent = totalMatches > 0 ? Number(((completedMatches * 100) / totalMatches).toFixed(2)) : 0
  const complete = totalMatches > 0 && completedMatches === totalMatches
  return {
    currentRound: stableNumber(round, 1),
    currentStage: stableNumber(stage, 1),
    completedMatches,
    totalMatches,
    progressPercent,
    isComplete: complete,
  }
}

async function createKnockoutRound(client, { businessId, tournament, matches, manualOverride = false }) {
  if (tournament.progression_locked && !manualOverride) {
    throw new HttpError(409, 'Progression is locked')
  }

  const stage = stableNumber(tournament.current_stage, 1)
  const round = stableNumber(tournament.current_round, 1)
  const roundMatches = getCurrentRoundMatches(matches, stage, round)
  if (!roundMatches.length) throw new HttpError(400, 'No matches found for current knockout round')
  if (!isRoundComplete(matches, round, stage)) throw new HttpError(409, 'Current round is not complete')

  const nextRound = round + 1
  const existingNext = getCurrentRoundMatches(matches, stage, nextRound)
  if (existingNext.length) throw new HttpError(409, 'Next round already generated')

  const winners = extractWinnersFromKnockoutRound(roundMatches)
  if (winners.length <= 1) {
    const nextStatus = 'finished'
    await client.query(
      `UPDATE tournaments
       SET status = $1,
           current_round = $2,
           updated_at = NOW()
       WHERE id = $3 AND business_id = $4`,
      [nextStatus, round, tournament.id, businessId],
    )
    logger.info('[PROGRESSION] Knockout tournament completed', { tournamentId: tournament.id, stage, round })
    return { createdMatches: [], generatedRound: null, completedTournament: true, stage, round }
  }

  const pairs = []
  for (let i = 0; i < winners.length; i += 2) {
    const home = winners[i]
    const away = winners[i + 1] || null
    pairs.push({ home, away })
  }

  const createdMatches = []
  for (const pair of pairs) {
    if (!pair.home) continue
    const isBye = !pair.away
    const insert = await client.query(
      `INSERT INTO tournament_matches (
         business_id, tournament_id, home_team_id, away_team_id, home_score, away_score, status,
         round_number, stage_name, leg_number, starts_at, stage_number, result_confirmed, winner_team_id, manual_override
       )
       VALUES ($1, $2, $3, $4, 0, 0, $5, $6, $7, 1, NULL, $8, $9, $10, $11)
       RETURNING id, home_team_id, away_team_id, round_number, stage_number, result_confirmed, winner_team_id`,
      [
        businessId,
        tournament.id,
        pair.home,
        pair.away,
        isBye ? 'finished' : 'pending',
        nextRound,
        `Round ${nextRound}`,
        stage,
        isBye,
        isBye ? pair.home : null,
        false,
      ],
    )
    createdMatches.push(insert.rows[0])
  }

  await client.query(
    `UPDATE tournaments
     SET current_round = $1,
         updated_at = NOW()
     WHERE id = $2 AND business_id = $3`,
    [nextRound, tournament.id, businessId],
  )

  logger.info('[PROGRESSION] Knockout round generated', {
    tournamentId: tournament.id,
    stage,
    fromRound: round,
    toRound: nextRound,
    matchesCreated: createdMatches.length,
  })
  return { createdMatches, generatedRound: nextRound, completedTournament: false, stage, round: nextRound }
}

async function createHybridKnockoutStage(client, { businessId, tournament, matches, teams, manualOverride = false }) {
  if (tournament.progression_locked && !manualOverride) {
    throw new HttpError(409, 'Progression is locked')
  }

  const stage = stableNumber(tournament.current_stage, 1)
  const round = stableNumber(tournament.current_round, 1)
  const stageMatches = (matches || []).filter((m) => stableNumber(m.stage_number, 1) === stage)
  if (!stageMatches.length) throw new HttpError(400, 'No matches found for current hybrid stage')
  if (!stageMatches.every((m) => Boolean(m.result_confirmed))) throw new HttpError(409, 'Current hybrid stage is not complete')

  const existingNextStage = (matches || []).filter((m) => stableNumber(m.stage_number, 1) === stage + 1)
  if (existingNextStage.length) throw new HttpError(409, 'Knockout stage already generated')

  const standings = buildRoundRobinStandings(teams, stageMatches)
  const qualifiersCount = Math.max(2, stableNumber(tournament.hybrid_qualifiers_count, 4))
  const qualifiers = standings.slice(0, qualifiersCount).map((item) => item.teamId)
  if (qualifiers.length < 2) throw new HttpError(400, 'Not enough qualified teams to generate knockout stage')

  const createdMatches = []
  for (let i = 0; i < qualifiers.length; i += 2) {
    const home = qualifiers[i]
    const away = qualifiers[i + 1] || null
    const isBye = !away
    const insert = await client.query(
      `INSERT INTO tournament_matches (
         business_id, tournament_id, home_team_id, away_team_id, home_score, away_score, status,
         round_number, stage_name, leg_number, starts_at, stage_number, result_confirmed, winner_team_id, manual_override
       )
       VALUES ($1, $2, $3, $4, 0, 0, $5, 1, $6, 1, NULL, $7, $8, $9, $10)
       RETURNING id, home_team_id, away_team_id, round_number, stage_number, result_confirmed, winner_team_id`,
      [
        businessId,
        tournament.id,
        home,
        away,
        isBye ? 'finished' : 'pending',
        'Hybrid Knockout',
        stage + 1,
        isBye,
        isBye ? home : null,
        false,
      ],
    )
    createdMatches.push(insert.rows[0])
  }

  await client.query(
    `UPDATE tournaments
     SET current_stage = $1,
         current_round = 1,
         updated_at = NOW()
     WHERE id = $2 AND business_id = $3`,
    [stage + 1, tournament.id, businessId],
  )

  logger.info('[PROGRESSION] Hybrid knockout stage generated', {
    tournamentId: tournament.id,
    fromStage: stage,
    toStage: stage + 1,
    qualifiers: qualifiers.length,
    matchesCreated: createdMatches.length,
  })
  return { createdMatches, generatedRound: 1, completedTournament: false, stage: stage + 1, round: 1 }
}

export async function getTournamentProgress(client, businessId, tournamentId) {
  const { tournament, matches } = await loadTournamentContext(client, businessId, tournamentId)
  const stage = stableNumber(tournament.current_stage, 1)
  const round = stableNumber(tournament.current_round, 1)
  const progress = computeProgress({ matches, stage, round })
  return {
    ...progress,
    tournamentId: stableNumber(tournament.id),
    tournamentName: String(tournament.name || ''),
    format: getEngineFormat(tournament),
    status: mapTournamentStatus(tournament.status),
    autoAdvance: Boolean(tournament.auto_advance),
    progressionLocked: Boolean(tournament.progression_locked),
  }
}

export async function generateNextRound(client, { businessId, tournamentId, manualOverride = false }) {
  const lockResult = await client.query(
    `SELECT id
     FROM tournaments
     WHERE id = $1 AND business_id = $2
     FOR UPDATE`,
    [tournamentId, businessId],
  )
  if (!lockResult.rows[0]) throw new HttpError(404, 'Tournament not found')

  const context = await loadTournamentContext(client, businessId, tournamentId)
  const tournament = context.tournament
  const engineFormat = getEngineFormat(tournament)
  const engineStatus = mapTournamentStatus(tournament.status)
  if (engineStatus !== 'active') throw new HttpError(409, 'Tournament must be active before generating next round')

  if (engineFormat === FORMAT_ROUND_ROBIN) {
    const stage = stableNumber(tournament.current_stage, 1)
    const allStageMatches = context.matches.filter((m) => stableNumber(m.stage_number, 1) === stage)
    const complete = allStageMatches.length > 0 && allStageMatches.every((m) => Boolean(m.result_confirmed))
    if (!complete) throw new HttpError(409, 'Round-robin stage is not complete')
    await client.query(
      `UPDATE tournaments
       SET status = 'finished',
           updated_at = NOW()
       WHERE id = $1 AND business_id = $2`,
      [tournamentId, businessId],
    )
    logger.info('[PROGRESSION] Round-robin tournament completed', { tournamentId })
    return { createdMatches: [], generatedRound: null, completedTournament: true, stage, round: stableNumber(tournament.current_round, 1) }
  }

  if (engineFormat === FORMAT_HYBRID) {
    const stage = stableNumber(tournament.current_stage, 1)
    if (stage === 1) {
      return createHybridKnockoutStage(client, {
        businessId,
        tournament,
        matches: context.matches,
        teams: context.teams,
        manualOverride,
      })
    }
  }

  return createKnockoutRound(client, {
    businessId,
    tournament,
    matches: context.matches,
    manualOverride,
  })
}

export async function toggleProgressionLock(client, { businessId, tournamentId, locked }) {
  const result = await client.query(
    `UPDATE tournaments
     SET progression_locked = $1,
         updated_at = NOW()
     WHERE id = $2 AND business_id = $3
     RETURNING id, progression_locked`,
    [Boolean(locked), tournamentId, businessId],
  )
  if (!result.rows[0]) throw new HttpError(404, 'Tournament not found')
  logger.info('[PROGRESSION] Progression lock toggled', { tournamentId, locked: Boolean(result.rows[0].progression_locked) })
  return { tournamentId: stableNumber(result.rows[0].id), progressionLocked: Boolean(result.rows[0].progression_locked) }
}

export async function evaluateRoundCompletion(client, { businessId, tournamentId }) {
  const { tournament, matches } = await loadTournamentContext(client, businessId, tournamentId)
  const stage = stableNumber(tournament.current_stage, 1)
  const round = stableNumber(tournament.current_round, 1)
  const progress = computeProgress({ matches, stage, round })
  return {
    ...progress,
    format: getEngineFormat(tournament),
    autoAdvance: Boolean(tournament.auto_advance),
    progressionLocked: Boolean(tournament.progression_locked),
  }
}
