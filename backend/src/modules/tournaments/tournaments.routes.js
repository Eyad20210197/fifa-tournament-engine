import { Router } from 'express'
import { z } from 'zod'
import { withTransaction, query } from '../../config/db.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { authenticate } from '../../middleware/authenticate.js'
import { authorize } from '../../middleware/authorize.js'
import { requireSubscription } from '../../middleware/requireSubscription.js'
import { HttpError } from '../../utils/httpError.js'

export const tournamentsRouter = Router()

const createTournamentSchema = z.object({
  name: z.string().min(1),
  format: z.enum(['دوري', 'خروج مغلوب']),
  starts_at: z.string().datetime().optional().nullable(),
  ends_at: z.string().datetime().optional().nullable(),
  teams: z
    .array(
      z.object({
        team_name: z.string().min(1),
        club_name: z.string().optional().nullable(),
        player1: z.string().optional().nullable(),
        player2: z.string().optional().nullable(),
        logo: z.string().optional().nullable(),
      }),
    )
    .default([]),
})

tournamentsRouter.use(authenticate, requireSubscription)

tournamentsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const result = await query(
      `SELECT id, name, format, status, starts_at, ends_at, created_at
       FROM tournaments
       WHERE business_id = $1
       ORDER BY id DESC`,
      [req.user.business_id],
    )
    return res.json({ success: true, data: result.rows })
  }),
)

tournamentsRouter.post(
  '/',
  authorize('ADMIN', 'STAFF'),
  asyncHandler(async (req, res) => {
    const parsed = createTournamentSchema.safeParse(req.body)
    if (!parsed.success) throw new HttpError(400, 'Invalid payload', parsed.error.issues)

    const payload = parsed.data
    const created = await withTransaction(async (client) => {
      const tournamentResult = await client.query(
        `INSERT INTO tournaments (business_id, name, format, status, starts_at, ends_at)
         VALUES ($1, $2, $3, 'draft', $4, $5)
         RETURNING id, business_id, name, format, status, starts_at, ends_at, created_at`,
        [req.user.business_id, payload.name, payload.format, payload.starts_at || null, payload.ends_at || null],
      )
      const tournament = tournamentResult.rows[0]

      for (const team of payload.teams) {
        await client.query(
          `INSERT INTO tournament_teams (business_id, tournament_id, team_name, club_name, player1, player2, logo)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            req.user.business_id,
            tournament.id,
            team.team_name,
            team.club_name || null,
            team.player1 || null,
            team.player2 || null,
            team.logo || null,
          ],
        )
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
      `SELECT id, name, format, status, starts_at, ends_at
       FROM tournaments
       WHERE id = $1 AND business_id = $2
       LIMIT 1`,
      [tournamentId, req.user.business_id],
    )
    if (!tournament.rows[0]) throw new HttpError(404, 'Tournament not found')

    const teams = await query(
      `SELECT id, team_name, club_name, player1, player2, logo
       FROM tournament_teams
       WHERE tournament_id = $1 AND business_id = $2
       ORDER BY id ASC`,
      [tournamentId, req.user.business_id],
    )
    const matches = await query(
      `SELECT id, home_team_id, away_team_id, home_score, away_score, status, round_number, starts_at
       FROM tournament_matches
       WHERE tournament_id = $1 AND business_id = $2
       ORDER BY id ASC`,
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
  '/:id/matches/:matchId',
  authorize('ADMIN', 'STAFF'),
  asyncHandler(async (req, res) => {
    const tournamentId = Number(req.params.id)
    const matchId = Number(req.params.matchId)
    const { home_score, away_score, status } = req.body || {}

    const result = await query(
      `UPDATE tournament_matches
       SET home_score = COALESCE($1, home_score),
           away_score = COALESCE($2, away_score),
           status = COALESCE($3, status),
           updated_at = NOW()
       WHERE id = $4
         AND tournament_id = $5
         AND business_id = $6
       RETURNING id, home_score, away_score, status`,
      [home_score ?? null, away_score ?? null, status ?? null, matchId, tournamentId, req.user.business_id],
    )
    if (!result.rows[0]) throw new HttpError(404, 'Match not found')
    return res.json({ success: true, data: result.rows[0] })
  }),
)

