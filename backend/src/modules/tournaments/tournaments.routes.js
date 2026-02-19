import { Router } from 'express'
import { z } from 'zod'
import { withTransaction, query } from '../../config/db.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { authenticate } from '../../middleware/authenticate.js'
import { authorize } from '../../middleware/authorize.js'
import { requireSubscription } from '../../middleware/requireSubscription.js'
import { HttpError } from '../../utils/httpError.js'

export const tournamentsRouter = Router()
const FORMAT_LEAGUE = '\u062f\u0648\u0631\u064a'
const FORMAT_KNOCKOUT = '\u062e\u0631\u0648\u062c \u0645\u063a\u0644\u0648\u0628'

const localDateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/

const optionalDateTimeSchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string') return value

  // Accept values coming from <input type="datetime-local"> and normalize to ISO.
  if (localDateTimePattern.test(value)) {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().replace(/\.\d{3}Z$/, 'Z')
  }

  return value
}, z.string().datetime({ offset: true }).nullable())

const teamInputSchema = z.object({
  team_name: z.string().min(1),
  club_name: z.string().optional().nullable(),
})

const createTournamentSchema = z.object({
  name: z.string().min(1),
  format: z.enum([FORMAT_LEAGUE, FORMAT_KNOCKOUT]),
  starts_at: optionalDateTimeSchema.optional(),
  ends_at: optionalDateTimeSchema.optional(),
  sponsor_logo_url: z.string().optional().nullable(),
  teams: z.array(teamInputSchema).max(128).default([]),
})

const updateTournamentSchema = z.object({
  name: z.string().min(1).optional(),
  format: z.enum([FORMAT_LEAGUE, FORMAT_KNOCKOUT]).optional(),
  starts_at: optionalDateTimeSchema.optional(),
  ends_at: optionalDateTimeSchema.optional(),
  sponsor_logo_url: z.string().optional().nullable(),
})

const updateTeamsSchema = z.object({
  teams: z.array(teamInputSchema).min(2).max(128),
})

const updateMatchSchema = z.object({
  home_score: z.coerce.number().int().nonnegative().optional(),
  away_score: z.coerce.number().int().nonnegative().optional(),
  status: z.enum(['pending', 'live', 'finished']).optional(),
  starts_at: optionalDateTimeSchema.optional(),
})

const bulkScheduleSchema = z.object({
  match_ids: z.array(z.coerce.number().int().positive()).min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  interval_minutes: z.coerce.number().int().nonnegative().max(600).default(30),
})

function shuffleTeams(teams) {
  const list = teams.slice()
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[list[i], list[j]] = [list[j], list[i]]
  }
  return list
}

function buildMatches(format, teams) {
  const shuffled = shuffleTeams(teams)
  const matches = []

  if (format === FORMAT_LEAGUE) {
    let round = 1
    for (let i = 0; i < shuffled.length; i += 1) {
      for (let j = i + 1; j < shuffled.length; j += 1) {
        matches.push({ home_team_id: shuffled[i].id, away_team_id: shuffled[j].id, round_number: round })
        round += 1
      }
    }
    return matches
  }

  let round = 1
  for (let i = 0; i + 1 < shuffled.length; i += 2) {
    matches.push({ home_team_id: shuffled[i].id, away_team_id: shuffled[i + 1].id, round_number: round })
  }
  return matches
}

async function regenerateMatches(client, { businessId, tournamentId, format, teams }) {
  await client.query('DELETE FROM tournament_matches WHERE tournament_id = $1 AND business_id = $2', [tournamentId, businessId])
  await client.query('DELETE FROM tournament_standings WHERE tournament_id = $1 AND business_id = $2', [tournamentId, businessId])

  const matches = buildMatches(format, teams)
  for (const match of matches) {
    await client.query(
      `INSERT INTO tournament_matches (business_id, tournament_id, home_team_id, away_team_id, status, round_number)
       VALUES ($1, $2, $3, $4, 'pending', $5)`,
      [businessId, tournamentId, match.home_team_id, match.away_team_id, match.round_number],
    )
  }
}

tournamentsRouter.use(authenticate, requireSubscription)

tournamentsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const result = await query(
      `SELECT t.id, t.name, t.format, t.status, t.starts_at, t.ends_at, t.sponsor_logo_url, t.created_at,
              COUNT(tt.id)::int AS teams_count
       FROM tournaments t
       LEFT JOIN tournament_teams tt ON tt.tournament_id = t.id AND tt.business_id = t.business_id
       WHERE t.business_id = $1
       GROUP BY t.id
       ORDER BY t.id DESC`,
      [req.user.business_id],
    )
    return res.json({ success: true, data: result.rows })
  }),
)

tournamentsRouter.post(
  '/',
  authorize('ADMIN'),
  asyncHandler(async (req, res) => {
    const parsed = createTournamentSchema.safeParse(req.body)
    if (!parsed.success) throw new HttpError(400, 'Invalid payload', parsed.error.issues)

    const payload = parsed.data
    const created = await withTransaction(async (client) => {
      const tournamentResult = await client.query(
        `INSERT INTO tournaments (business_id, name, format, status, starts_at, ends_at, sponsor_logo_url)
         VALUES ($1, $2, $3, 'draft', $4, $5, $6)
         RETURNING id, business_id, name, format, status, starts_at, ends_at, sponsor_logo_url, created_at`,
        [
          req.user.business_id,
          payload.name,
          payload.format,
          payload.starts_at || null,
          payload.ends_at || null,
          payload.sponsor_logo_url || null,
        ],
      )
      const tournament = tournamentResult.rows[0]

      const teams = []
      for (const team of payload.teams) {
        const teamResult = await client.query(
          `INSERT INTO tournament_teams (business_id, tournament_id, team_name, club_name)
           VALUES ($1, $2, $3, $4)
           RETURNING id, team_name, club_name`,
          [
            req.user.business_id,
            tournament.id,
            team.team_name,
            team.club_name || null,
          ],
        )
        teams.push(teamResult.rows[0])
      }

      if (teams.length >= 2) {
        await regenerateMatches(client, {
          businessId: req.user.business_id,
          tournamentId: tournament.id,
          format: payload.format,
          teams,
        })
      }

      return tournament
    })

    return res.status(201).json({ success: true, data: created })
  }),
)

tournamentsRouter.get(
  '/:id/details',
  asyncHandler(async (req, res) => {
    const tournamentId = Number(req.params.id)
    const tournament = await query(
      `SELECT id, name, format, status, starts_at, ends_at, sponsor_logo_url
       FROM tournaments
       WHERE id = $1 AND business_id = $2
       LIMIT 1`,
      [tournamentId, req.user.business_id],
    )
    if (!tournament.rows[0]) throw new HttpError(404, 'Tournament not found')

    const teams = await query(
      `SELECT id, team_name, club_name
       FROM tournament_teams
       WHERE tournament_id = $1 AND business_id = $2
       ORDER BY id ASC`,
      [tournamentId, req.user.business_id],
    )
    const matches = await query(
      `SELECT id, home_team_id, away_team_id, home_score, away_score, status, round_number, starts_at
       FROM tournament_matches
       WHERE tournament_id = $1 AND business_id = $2
       ORDER BY round_number ASC, id ASC`,
      [tournamentId, req.user.business_id],
    )
    const standings = await query(
      `SELECT id, team_id, played, wins, draws, losses, goals_for, goals_against, goal_diff, points
       FROM tournament_standings
       WHERE tournament_id = $1 AND business_id = $2
       ORDER BY points DESC, goal_diff DESC, goals_for DESC, id ASC`,
      [tournamentId, req.user.business_id],
    )

    return res.json({
      success: true,
      data: {
        ...tournament.rows[0],
        teams: teams.rows,
        matches: matches.rows,
        standings: standings.rows,
      },
    })
  }),
)

tournamentsRouter.patch(
  '/:id',
  authorize('ADMIN'),
  asyncHandler(async (req, res) => {
    const tournamentId = Number(req.params.id)
    const parsed = updateTournamentSchema.safeParse(req.body)
    if (!parsed.success) throw new HttpError(400, 'Invalid payload', parsed.error.issues)

    const payload = parsed.data
    if (Object.keys(payload).length === 0) throw new HttpError(400, 'No fields to update')

    const result = await query(
      `UPDATE tournaments
       SET name = COALESCE($1, name),
           format = COALESCE($2, format),
           starts_at = COALESCE($3, starts_at),
           ends_at = COALESCE($4, ends_at),
           sponsor_logo_url = COALESCE($5, sponsor_logo_url),
           updated_at = NOW()
       WHERE id = $6 AND business_id = $7
       RETURNING id, name, format, status, starts_at, ends_at, sponsor_logo_url, updated_at`,
      [
        payload.name ?? null,
        payload.format ?? null,
        payload.starts_at ?? null,
        payload.ends_at ?? null,
        payload.sponsor_logo_url ?? null,
        tournamentId,
        req.user.business_id,
      ],
    )

    if (!result.rows[0]) throw new HttpError(404, 'Tournament not found')

    if (payload.format) {
      await withTransaction(async (client) => {
        const teamsResult = await client.query(
          `SELECT id, team_name, club_name
           FROM tournament_teams
           WHERE tournament_id = $1 AND business_id = $2
           ORDER BY id ASC`,
          [tournamentId, req.user.business_id],
        )
        if (teamsResult.rows.length >= 2) {
          await regenerateMatches(client, {
            businessId: req.user.business_id,
            tournamentId,
            format: payload.format,
            teams: teamsResult.rows,
          })
        }
      })
    }

    return res.json({ success: true, data: result.rows[0] })
  }),
)

tournamentsRouter.put(
  '/:id/teams',
  authorize('ADMIN'),
  asyncHandler(async (req, res) => {
    const tournamentId = Number(req.params.id)
    const parsed = updateTeamsSchema.safeParse(req.body)
    if (!parsed.success) throw new HttpError(400, 'Invalid payload', parsed.error.issues)

    const updated = await withTransaction(async (client) => {
      const tournamentResult = await client.query(
        `SELECT id, format
         FROM tournaments
         WHERE id = $1 AND business_id = $2
         LIMIT 1`,
        [tournamentId, req.user.business_id],
      )
      const tournament = tournamentResult.rows[0]
      if (!tournament) throw new HttpError(404, 'Tournament not found')

      await client.query('DELETE FROM tournament_matches WHERE tournament_id = $1 AND business_id = $2', [tournamentId, req.user.business_id])
      await client.query('DELETE FROM tournament_standings WHERE tournament_id = $1 AND business_id = $2', [tournamentId, req.user.business_id])
      await client.query('DELETE FROM tournament_teams WHERE tournament_id = $1 AND business_id = $2', [tournamentId, req.user.business_id])

      const teams = []
      for (const team of parsed.data.teams) {
        const result = await client.query(
          `INSERT INTO tournament_teams (business_id, tournament_id, team_name, club_name)
           VALUES ($1, $2, $3, $4)
           RETURNING id, team_name, club_name`,
          [
            req.user.business_id,
            tournamentId,
            team.team_name,
            team.club_name || null,
          ],
        )
        teams.push(result.rows[0])
      }

      await regenerateMatches(client, {
        businessId: req.user.business_id,
        tournamentId,
        format: tournament.format,
        teams,
      })

      return teams
    })

    return res.json({ success: true, data: updated })
  }),
)

tournamentsRouter.post(
  '/:id/launch',
  authorize('ADMIN'),
  asyncHandler(async (req, res) => {
    const tournamentId = Number(req.params.id)

    const teamsResult = await query(
      `SELECT COUNT(*)::int AS count
       FROM tournament_teams
       WHERE tournament_id = $1 AND business_id = $2`,
      [tournamentId, req.user.business_id],
    )
    const matchesResult = await query(
      `SELECT COUNT(*)::int AS count
       FROM tournament_matches
       WHERE tournament_id = $1 AND business_id = $2`,
      [tournamentId, req.user.business_id],
    )

    if ((teamsResult.rows[0]?.count || 0) < 2) throw new HttpError(400, 'At least two teams are required')
    if ((matchesResult.rows[0]?.count || 0) < 1) throw new HttpError(400, 'No matches available to launch')

    const result = await query(
      `UPDATE tournaments
       SET status = 'scheduled', updated_at = NOW()
       WHERE id = $1 AND business_id = $2
       RETURNING id, name, format, status, starts_at, ends_at, sponsor_logo_url, updated_at`,
      [tournamentId, req.user.business_id],
    )

    if (!result.rows[0]) throw new HttpError(404, 'Tournament not found')
    return res.json({ success: true, data: result.rows[0] })
  }),
)

tournamentsRouter.patch(
  '/:id/matches/schedule-day',
  authorize('ADMIN'),
  asyncHandler(async (req, res) => {
    const tournamentId = Number(req.params.id)
    const parsed = bulkScheduleSchema.safeParse(req.body || {})
    if (!parsed.success) throw new HttpError(400, 'Invalid payload', parsed.error.issues)

    const payload = parsed.data
    const startLocal = new Date(`${payload.date}T${payload.start_time}:00`)
    if (Number.isNaN(startLocal.getTime())) throw new HttpError(400, 'Invalid date/time')

    const updated = await withTransaction(async (client) => {
      const check = await client.query(
        `SELECT id
         FROM tournaments
         WHERE id = $1 AND business_id = $2
         LIMIT 1`,
        [tournamentId, req.user.business_id],
      )
      if (!check.rows[0]) throw new HttpError(404, 'Tournament not found')

      const uniqueIds = [...new Set(payload.match_ids)]
      for (let i = 0; i < uniqueIds.length; i += 1) {
        const slot = new Date(startLocal.getTime() + i * payload.interval_minutes * 60000)
        const startsAt = slot.toISOString().replace(/\.\d{3}Z$/, 'Z')
        const result = await client.query(
          `UPDATE tournament_matches
           SET starts_at = $1,
               updated_at = NOW()
           WHERE id = $2
             AND tournament_id = $3
             AND business_id = $4
           RETURNING id`,
          [startsAt, uniqueIds[i], tournamentId, req.user.business_id],
        )
        if (!result.rows[0]) throw new HttpError(404, `Match not found: ${uniqueIds[i]}`)
      }

      const refreshed = await client.query(
        `SELECT id, home_team_id, away_team_id, home_score, away_score, status, round_number, starts_at
         FROM tournament_matches
         WHERE id = ANY($1::bigint[])
           AND tournament_id = $2
           AND business_id = $3
         ORDER BY starts_at ASC, id ASC`,
        [uniqueIds, tournamentId, req.user.business_id],
      )
      return refreshed.rows
    })

    return res.json({ success: true, data: updated })
  }),
)

tournamentsRouter.patch(
  '/:id/matches/:matchId',
  authorize('ADMIN', 'STAFF'),
  asyncHandler(async (req, res) => {
    const tournamentId = Number(req.params.id)
    const matchId = Number(req.params.matchId)
    const parsed = updateMatchSchema.safeParse(req.body || {})
    if (!parsed.success) throw new HttpError(400, 'Invalid payload', parsed.error.issues)

    const payload = parsed.data
    if (Object.keys(payload).length === 0) throw new HttpError(400, 'No fields to update')

    const result = await query(
      `UPDATE tournament_matches
       SET home_score = COALESCE($1, home_score),
           away_score = COALESCE($2, away_score),
           status = COALESCE($3, status),
           starts_at = COALESCE($4, starts_at),
           updated_at = NOW()
       WHERE id = $5
         AND tournament_id = $6
         AND business_id = $7
       RETURNING id, home_team_id, away_team_id, home_score, away_score, status, round_number, starts_at`,
      [
        payload.home_score ?? null,
        payload.away_score ?? null,
        payload.status ?? null,
        payload.starts_at ?? null,
        matchId,
        tournamentId,
        req.user.business_id,
      ],
    )
    if (!result.rows[0]) throw new HttpError(404, 'Match not found')
    return res.json({ success: true, data: result.rows[0] })
  }),
)
