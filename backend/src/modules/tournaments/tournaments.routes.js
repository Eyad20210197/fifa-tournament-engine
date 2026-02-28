import { Router } from 'express'
import { z } from 'zod'
import { withTransaction, query } from '../../config/db.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { authenticate } from '../../middleware/authenticate.js'
import { authorize } from '../../middleware/authorize.js'
import { requireSubscription } from '../../middleware/requireSubscription.js'
import { HttpError } from '../../utils/httpError.js'
import { publishEvent } from '../../services/ably.service.js'
import { matchChannel, tournamentChannel } from '../../services/channel-names.service.js'
import { evaluateRoundCompletion, generateNextRound, getTournamentProgress, toggleProgressionLock } from '../../services/progression.service.js'

export const tournamentsRouter = Router()
const FORMAT_LEAGUE = '\u062f\u0648\u0631\u064a'
const FORMAT_KNOCKOUT = '\u062e\u0631\u0648\u062c \u0645\u063a\u0644\u0648\u0628'
const HOME_AWAY_STAGE_VALUES = ['league', 'all', 'final', 'semi_final', 'quarter_final', 'round_of_16', 'round_of_32']

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
  home_away_enabled: z.coerce.boolean().optional().default(false),
  home_away_stage: z
    .enum(HOME_AWAY_STAGE_VALUES)
    .optional()
    .nullable(),
  home_away_stages: z
    .array(z.enum(HOME_AWAY_STAGE_VALUES))
    .optional()
    .nullable(),
  progression_format: z.enum(['knockout', 'round_robin', 'hybrid']).optional(),
  current_stage: z.coerce.number().int().positive().optional(),
  current_round: z.coerce.number().int().positive().optional(),
  auto_advance: z.coerce.boolean().optional(),
  progression_locked: z.coerce.boolean().optional(),
  hybrid_qualifiers_count: z.coerce.number().int().min(2).max(64).optional(),
  teams: z.array(teamInputSchema).max(128).default([]),
})

const updateTournamentSchema = z.object({
  name: z.string().min(1).optional(),
  format: z.enum([FORMAT_LEAGUE, FORMAT_KNOCKOUT]).optional(),
  status: z.enum(['draft', 'scheduled', 'live', 'finished']).optional(),
  starts_at: optionalDateTimeSchema.optional(),
  ends_at: optionalDateTimeSchema.optional(),
  sponsor_logo_url: z.string().optional().nullable(),
  home_away_enabled: z.coerce.boolean().optional(),
  home_away_stage: z
    .enum(HOME_AWAY_STAGE_VALUES)
    .optional()
    .nullable(),
  home_away_stages: z
    .array(z.enum(HOME_AWAY_STAGE_VALUES))
    .optional()
    .nullable(),
  progression_format: z.enum(['knockout', 'round_robin', 'hybrid']).optional(),
  current_stage: z.coerce.number().int().positive().optional(),
  current_round: z.coerce.number().int().positive().optional(),
  auto_advance: z.coerce.boolean().optional(),
  progression_locked: z.coerce.boolean().optional(),
  hybrid_qualifiers_count: z.coerce.number().int().min(2).max(64).optional(),
})

const updateTeamsSchema = z.object({
  teams: z.array(teamInputSchema).min(2).max(128),
})

const updateMatchSchema = z.object({
  home_score: z.coerce.number().int().nonnegative().optional(),
  away_score: z.coerce.number().int().nonnegative().optional(),
  status: z.enum(['pending', 'live', 'finished']).optional(),
  starts_at: optionalDateTimeSchema.optional(),
  result_confirmed: z.coerce.boolean().optional(),
  winner_team_id: z
    .preprocess((value) => (value === undefined || value === null || value === '' ? null : value), z.coerce.number().int().positive().nullable())
    .optional(),
  manual_override: z.coerce.boolean().optional(),
})

const bulkScheduleSchema = z.object({
  match_ids: z.array(z.coerce.number().int().positive()).min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  interval_minutes: z.coerce.number().int().nonnegative().max(600).default(30),
  timezone_offset_minutes: z.coerce.number().int().min(-840).max(840).optional().default(0),
})

function shuffleTeams(teams) {
  const list = teams.slice()
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[list[i], list[j]] = [list[j], list[i]]
  }
  return list
}

function knockoutStageKeyFromTeamCount(teamCount) {
  if (teamCount <= 2) return 'final'
  if (teamCount <= 4) return 'semi_final'
  if (teamCount <= 8) return 'quarter_final'
  if (teamCount <= 16) return 'round_of_16'
  return 'round_of_32'
}

function stageLabelFromKey(stageKey) {
  if (stageKey === 'final') return 'النهائي'
  if (stageKey === 'semi_final') return 'نصف النهائي'
  if (stageKey === 'quarter_final') return 'ربع النهائي'
  if (stageKey === 'round_of_16') return 'دور الـ16'
  if (stageKey === 'round_of_32') return 'دور الـ32'
  return 'المرحلة الرئيسية'
}

function normalizeHomeAwayStages({ format, enabled, stages, stageLegacy }) {
  if (!enabled) return []
  if (Array.isArray(stages) && stages.length > 0) return [...new Set(stages.map((item) => String(item).trim()).filter(Boolean))]
  if (stageLegacy) return [String(stageLegacy)]
  return format === FORMAT_LEAGUE ? ['league'] : ['final']
}

function buildMatches(format, teams, config = {}) {
  const shuffled = shuffleTeams(teams)
  const matches = []
  const homeAwayEnabled = Boolean(config.homeAwayEnabled)
  const selectedStages = new Set((Array.isArray(config.homeAwayStages) ? config.homeAwayStages : []).map((item) => String(item || '').trim()))

  if (format === FORMAT_LEAGUE) {
    let round = 1
    for (let i = 0; i < shuffled.length; i += 1) {
      for (let j = i + 1; j < shuffled.length; j += 1) {
        const stageName = `الجولة ${round}`
        matches.push({
          home_team_id: shuffled[i].id,
          away_team_id: shuffled[j].id,
          round_number: round,
          stage_name: stageName,
          leg_number: 1,
        })
        if (homeAwayEnabled && (selectedStages.size === 0 || selectedStages.has('league') || selectedStages.has('all'))) {
          matches.push({
            home_team_id: shuffled[j].id,
            away_team_id: shuffled[i].id,
            round_number: round,
            stage_name: stageName,
            leg_number: 2,
          })
        }
        round += 1
      }
    }
    return matches
  }

  const stageKey = knockoutStageKeyFromTeamCount(shuffled.length)
  const stageName = stageLabelFromKey(stageKey)
  const applyHomeAway = homeAwayEnabled && (selectedStages.size === 0 || selectedStages.has('all') || selectedStages.has(stageKey))
  for (let i = 0; i + 1 < shuffled.length; i += 2) {
    matches.push({
      home_team_id: shuffled[i].id,
      away_team_id: shuffled[i + 1].id,
      round_number: 1,
      stage_name: stageName,
      leg_number: 1,
    })
    if (applyHomeAway) {
      matches.push({
        home_team_id: shuffled[i + 1].id,
        away_team_id: shuffled[i].id,
        round_number: 1,
        stage_name: stageName,
        leg_number: 2,
      })
    }
  }
  return matches
}

async function regenerateMatches(client, { businessId, tournamentId, format, teams, homeAwayEnabled = false, homeAwayStages = [] }) {
  await client.query('DELETE FROM tournament_matches WHERE tournament_id = $1 AND business_id = $2', [tournamentId, businessId])
  await client.query('DELETE FROM tournament_standings WHERE tournament_id = $1 AND business_id = $2', [tournamentId, businessId])

  const matches = buildMatches(format, teams, {
    homeAwayEnabled,
    homeAwayStages,
  })
  for (const match of matches) {
    await client.query(
      `INSERT INTO tournament_matches (
         business_id, tournament_id, home_team_id, away_team_id, status, round_number, stage_name, leg_number,
         stage_number, result_confirmed, winner_team_id, manual_override
       )
       VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7, 1, FALSE, NULL, FALSE)`,
      [businessId, tournamentId, match.home_team_id, match.away_team_id, match.round_number, match.stage_name, match.leg_number],
    )
  }
}

tournamentsRouter.use(authenticate, requireSubscription)

tournamentsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const result = await query(
      `SELECT t.id, t.name, t.format, t.status, t.starts_at, t.ends_at, t.sponsor_logo_url, t.created_at,
              t.home_away_enabled, t.home_away_stage, t.home_away_stages,
              t.progression_format, t.current_stage, t.current_round, t.auto_advance, t.progression_locked, t.hybrid_qualifiers_count,
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
    const homeAwayStages = normalizeHomeAwayStages({
      format: payload.format,
      enabled: payload.home_away_enabled ?? false,
      stages: payload.home_away_stages,
      stageLegacy: payload.home_away_stage,
    })

    const created = await withTransaction(async (client) => {
      const tournamentResult = await client.query(
        `INSERT INTO tournaments (
           business_id, name, format, status, starts_at, ends_at, sponsor_logo_url,
           home_away_enabled, home_away_stage, home_away_stages,
           progression_format, current_stage, current_round, auto_advance, progression_locked, hybrid_qualifiers_count
         )
         VALUES ($1, $2, $3, 'draft', $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         RETURNING id, business_id, name, format, status, starts_at, ends_at, sponsor_logo_url,
                   home_away_enabled, home_away_stage, home_away_stages,
                   progression_format, current_stage, current_round, auto_advance, progression_locked, hybrid_qualifiers_count, created_at`,
        [
          req.user.business_id,
          payload.name,
          payload.format,
          payload.starts_at || null,
          payload.ends_at || null,
          payload.sponsor_logo_url || null,
          payload.home_away_enabled ?? false,
          payload.home_away_stage ?? null,
          homeAwayStages,
          payload.progression_format ?? (payload.format === FORMAT_KNOCKOUT ? 'knockout' : 'round_robin'),
          payload.current_stage ?? 1,
          payload.current_round ?? 1,
          payload.auto_advance ?? false,
          payload.progression_locked ?? false,
          payload.hybrid_qualifiers_count ?? 4,
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
          homeAwayEnabled: payload.home_away_enabled ?? false,
          homeAwayStages,
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
      `SELECT id, name, format, status, starts_at, ends_at, sponsor_logo_url, home_away_enabled, home_away_stage, home_away_stages,
              progression_format, current_stage, current_round, auto_advance, progression_locked, hybrid_qualifiers_count
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
      `SELECT id, home_team_id, away_team_id, home_score, away_score, status, round_number, stage_name, leg_number, starts_at,
              stage_number, result_confirmed, winner_team_id, manual_override
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

    const nextEnabled = Object.prototype.hasOwnProperty.call(payload, 'home_away_enabled') ? Boolean(payload.home_away_enabled) : null
    const stagesPatch = Object.prototype.hasOwnProperty.call(payload, 'home_away_stages')
      ? payload.home_away_stages
      : Object.prototype.hasOwnProperty.call(payload, 'home_away_stage')
        ? [payload.home_away_stage].filter(Boolean)
        : undefined
    const normalizedStages = nextEnabled === false
      ? []
      : stagesPatch !== undefined
        ? normalizeHomeAwayStages({
            format: payload.format || FORMAT_LEAGUE,
            enabled: nextEnabled !== null ? nextEnabled : true,
            stages: stagesPatch,
            stageLegacy: null,
          })
        : null

    const result = await query(
      `UPDATE tournaments
       SET name = COALESCE($1, name),
           format = COALESCE($2, format),
           status = COALESCE($3, status),
           starts_at = COALESCE($4, starts_at),
           ends_at = COALESCE($5, ends_at),
           sponsor_logo_url = COALESCE($6, sponsor_logo_url),
           home_away_enabled = COALESCE($7, home_away_enabled),
           home_away_stage = COALESCE($8, home_away_stage),
           home_away_stages = COALESCE($9, home_away_stages),
           progression_format = COALESCE($10, progression_format),
           current_stage = COALESCE($11, current_stage),
           current_round = COALESCE($12, current_round),
           auto_advance = COALESCE($13, auto_advance),
           progression_locked = COALESCE($14, progression_locked),
           hybrid_qualifiers_count = COALESCE($15, hybrid_qualifiers_count),
           updated_at = NOW()
       WHERE id = $16 AND business_id = $17
       RETURNING id, name, format, status, starts_at, ends_at, sponsor_logo_url, home_away_enabled, home_away_stage, home_away_stages,
                 progression_format, current_stage, current_round, auto_advance, progression_locked, hybrid_qualifiers_count, updated_at`,
      [
        payload.name ?? null,
        payload.format ?? null,
        payload.status ?? null,
        payload.starts_at ?? null,
        payload.ends_at ?? null,
        payload.sponsor_logo_url ?? null,
        nextEnabled,
        payload.home_away_stage ?? null,
        Object.prototype.hasOwnProperty.call(payload, 'home_away_stages') ||
        Object.prototype.hasOwnProperty.call(payload, 'home_away_enabled') ||
        Object.prototype.hasOwnProperty.call(payload, 'home_away_stage')
          ? normalizedStages
          : null,
        payload.progression_format ?? null,
        payload.current_stage ?? null,
        payload.current_round ?? null,
        Object.prototype.hasOwnProperty.call(payload, 'auto_advance') ? Boolean(payload.auto_advance) : null,
        Object.prototype.hasOwnProperty.call(payload, 'progression_locked') ? Boolean(payload.progression_locked) : null,
        payload.hybrid_qualifiers_count ?? null,
        tournamentId,
        req.user.business_id,
      ],
    )

    if (!result.rows[0]) throw new HttpError(404, 'Tournament not found')

    if (
      payload.format ||
      Object.prototype.hasOwnProperty.call(payload, 'home_away_enabled') ||
      Object.prototype.hasOwnProperty.call(payload, 'home_away_stage') ||
      Object.prototype.hasOwnProperty.call(payload, 'home_away_stages')
    ) {
      await withTransaction(async (client) => {
        const teamsResult = await client.query(
          `SELECT t.id, t.team_name, t.club_name, tr.format, tr.home_away_enabled, tr.home_away_stage, tr.home_away_stages
           FROM tournament_teams t
           JOIN tournaments tr
             ON tr.id = t.tournament_id
            AND tr.business_id = t.business_id
           WHERE t.tournament_id = $1 AND t.business_id = $2
           ORDER BY t.id ASC`,
          [tournamentId, req.user.business_id],
        )
        if (teamsResult.rows.length >= 2) {
          const base = teamsResult.rows[0]
          await regenerateMatches(client, {
            businessId: req.user.business_id,
            tournamentId,
            format: payload.format || base.format,
            homeAwayEnabled: Object.prototype.hasOwnProperty.call(payload, 'home_away_enabled')
              ? Boolean(payload.home_away_enabled)
              : Boolean(base.home_away_enabled),
            homeAwayStages: normalizeHomeAwayStages({
              format: payload.format || base.format,
              enabled: Object.prototype.hasOwnProperty.call(payload, 'home_away_enabled')
                ? Boolean(payload.home_away_enabled)
                : Boolean(base.home_away_enabled),
              stages: Object.prototype.hasOwnProperty.call(payload, 'home_away_stages')
                ? payload.home_away_stages
                : base.home_away_stages,
              stageLegacy: Object.prototype.hasOwnProperty.call(payload, 'home_away_stage')
                ? payload.home_away_stage
                : base.home_away_stage,
            }),
            teams: teamsResult.rows.map((row) => ({
              id: row.id,
              team_name: row.team_name,
              club_name: row.club_name,
            })),
          })
        }
      })
    }

    return res.json({ success: true, data: result.rows[0] })
  }),
)

tournamentsRouter.delete(
  '/:id',
  authorize('ADMIN'),
  asyncHandler(async (req, res) => {
    const tournamentId = Number(req.params.id)
    const result = await query(
      `DELETE FROM tournaments
       WHERE id = $1 AND business_id = $2
       RETURNING id, name`,
      [tournamentId, req.user.business_id],
    )
    if (!result.rows[0]) throw new HttpError(404, 'Tournament not found')
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
      `SELECT id, format, home_away_enabled, home_away_stage, home_away_stages
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
        homeAwayEnabled: Boolean(tournament.home_away_enabled),
        homeAwayStages: normalizeHomeAwayStages({
          format: tournament.format,
          enabled: Boolean(tournament.home_away_enabled),
          stages: tournament.home_away_stages,
          stageLegacy: tournament.home_away_stage,
        }),
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
       RETURNING id, name, format, status, starts_at, ends_at, sponsor_logo_url, home_away_enabled, home_away_stage, home_away_stages,
                 progression_format, current_stage, current_round, auto_advance, progression_locked, hybrid_qualifiers_count, updated_at`,
      [tournamentId, req.user.business_id],
    )

    if (!result.rows[0]) throw new HttpError(404, 'Tournament not found')
    return res.json({ success: true, data: result.rows[0] })
  }),
)

tournamentsRouter.get(
  '/:id/progress',
  authorize('ADMIN', 'STAFF'),
  asyncHandler(async (req, res) => {
    const tournamentId = Number(req.params.id)
    const progress = await withTransaction(async (client) => getTournamentProgress(client, req.user.business_id, tournamentId))
    return res.json({ success: true, data: progress })
  }),
)

tournamentsRouter.post(
  '/:id/generate-next-round',
  authorize('ADMIN'),
  asyncHandler(async (req, res) => {
    const tournamentId = Number(req.params.id)
    const generated = await withTransaction(async (client) =>
      generateNextRound(client, {
        businessId: req.user.business_id,
        tournamentId,
        manualOverride: Boolean(req.body?.manualOverride),
      }),
    )

    const tournamentIdChannel = tournamentChannel(tournamentId)
    if (generated.generatedRound != null && tournamentIdChannel) {
      await publishEvent(tournamentIdChannel, 'round:created', {
        tournamentId,
        round: generated.generatedRound,
        stage: generated.stage,
        updatedAt: new Date().toISOString(),
      })
    }

    return res.json({
      success: true,
      data: generated,
    })
  }),
)

tournamentsRouter.patch(
  '/:id/lock-progression',
  authorize('ADMIN'),
  asyncHandler(async (req, res) => {
    const tournamentId = Number(req.params.id)
    const locked = Boolean(req.body?.locked)
    const result = await withTransaction(async (client) =>
      toggleProgressionLock(client, {
        businessId: req.user.business_id,
        tournamentId,
        locked,
      }),
    )
    return res.json({ success: true, data: result })
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
    const [yearText, monthText, dayText] = payload.date.split('-')
    const [hourText, minuteText] = payload.start_time.split(':')
    const year = Number(yearText)
    const month = Number(monthText)
    const day = Number(dayText)
    const hour = Number(hourText)
    const minute = Number(minuteText)
    if ([year, month, day, hour, minute].some((value) => !Number.isFinite(value))) {
      throw new HttpError(400, 'Invalid date/time')
    }
    // Convert client-local date/time to UTC using the client-provided offset.
    const startUtcMs = Date.UTC(year, month - 1, day, hour, minute) + payload.timezone_offset_minutes * 60000
    if (Number.isNaN(startUtcMs)) throw new HttpError(400, 'Invalid date/time')

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
        const slot = new Date(startUtcMs + i * payload.interval_minutes * 60000)
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
        `SELECT id, home_team_id, away_team_id, home_score, away_score, status, round_number, stage_name, leg_number, starts_at,
                stage_number, result_confirmed, winner_team_id, manual_override
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
    const previous = await query(
      `SELECT id, home_score, away_score, status, result_confirmed
       FROM tournament_matches
       WHERE id = $1
         AND tournament_id = $2
         AND business_id = $3
       LIMIT 1`,
      [matchId, tournamentId, req.user.business_id],
    )
    const previousMatch = previous.rows[0]
    if (!previousMatch) throw new HttpError(404, 'Match not found')

    const result = await query(
      `UPDATE tournament_matches
       SET home_score = COALESCE($1, home_score),
           away_score = COALESCE($2, away_score),
           status = COALESCE($3, status),
           starts_at = COALESCE($4, starts_at),
           result_confirmed = COALESCE($5, result_confirmed),
           winner_team_id = COALESCE($6, winner_team_id),
           manual_override = COALESCE($7, manual_override),
           updated_at = NOW()
       WHERE id = $8
         AND tournament_id = $9
         AND business_id = $10
       RETURNING id, home_team_id, away_team_id, home_score, away_score, status, round_number, stage_name, leg_number, starts_at,
                 stage_number, result_confirmed, winner_team_id, manual_override`,
      [
        payload.home_score ?? null,
        payload.away_score ?? null,
        payload.status ?? null,
        payload.starts_at ?? null,
        Object.prototype.hasOwnProperty.call(payload, 'result_confirmed') ? Boolean(payload.result_confirmed) : null,
        Object.prototype.hasOwnProperty.call(payload, 'winner_team_id') ? payload.winner_team_id ?? null : null,
        Object.prototype.hasOwnProperty.call(payload, 'manual_override') ? Boolean(payload.manual_override) : null,
        matchId,
        tournamentId,
        req.user.business_id,
      ],
    )
    const updatedMatch = result.rows[0]
    if (!updatedMatch) throw new HttpError(404, 'Match not found')

    const updatedAt = new Date().toISOString()
    const matchIdChannel = matchChannel(matchId)
    const tournamentIdChannel = tournamentChannel(tournamentId)
    const basePayload = {
      tournamentId,
      matchId,
      homeScore: Number(updatedMatch.home_score || 0),
      awayScore: Number(updatedMatch.away_score || 0),
      status: String(updatedMatch.status || ''),
      updatedAt,
    }
    if (matchIdChannel) {
      await publishEvent(matchIdChannel, 'match:update', basePayload)
    }
    const previousHome = Number(previousMatch.home_score || 0)
    const previousAway = Number(previousMatch.away_score || 0)
    const previousStatus = String(previousMatch.status || '')
    const nextStatus = String(updatedMatch.status || '')
    const previousConfirmed = Boolean(previousMatch.result_confirmed)
    const nextConfirmed = Boolean(updatedMatch.result_confirmed)

    if (previousHome !== basePayload.homeScore || previousAway !== basePayload.awayScore) {
      await Promise.all([
        matchIdChannel ? publishEvent(matchIdChannel, 'score:update', basePayload) : Promise.resolve(),
        tournamentIdChannel ? publishEvent(tournamentIdChannel, 'score:update', basePayload) : Promise.resolve(),
      ])
    }
    if (previousStatus !== nextStatus) {
      if (previousStatus !== 'live' && nextStatus === 'live') {
        await Promise.all([
          matchIdChannel ? publishEvent(matchIdChannel, 'match:start', basePayload) : Promise.resolve(),
          tournamentIdChannel ? publishEvent(tournamentIdChannel, 'match:start', basePayload) : Promise.resolve(),
        ])
      }
      if (previousStatus !== 'finished' && nextStatus === 'finished') {
        await Promise.all([
          matchIdChannel ? publishEvent(matchIdChannel, 'match:end', basePayload) : Promise.resolve(),
          tournamentIdChannel ? publishEvent(tournamentIdChannel, 'match:end', basePayload) : Promise.resolve(),
        ])
      }
    }

    if (!previousConfirmed && nextConfirmed && tournamentIdChannel) {
      await publishEvent(tournamentIdChannel, 'match:updated', {
        tournamentId,
        matchId,
        updatedAt: new Date().toISOString(),
      })

      const roundProgress = await withTransaction(async (client) =>
        evaluateRoundCompletion(client, {
          businessId: req.user.business_id,
          tournamentId,
        }),
      )

      if (roundProgress.isComplete) {
        await publishEvent(tournamentIdChannel, 'round:completed', {
          tournamentId,
          round: roundProgress.currentRound,
          stage: roundProgress.currentStage,
          updatedAt: new Date().toISOString(),
        })

        if (roundProgress.autoAdvance && !roundProgress.progressionLocked) {
          const generated = await withTransaction(async (client) =>
            generateNextRound(client, {
              businessId: req.user.business_id,
              tournamentId,
              manualOverride: false,
            }),
          ).catch(() => null)

          if (generated?.generatedRound != null) {
            await publishEvent(tournamentIdChannel, 'round:created', {
              tournamentId,
              round: generated.generatedRound,
              stage: generated.stage,
              updatedAt: new Date().toISOString(),
            })
          }
        }
      }
    }

    return res.json({ success: true, data: updatedMatch })
  }),
)
