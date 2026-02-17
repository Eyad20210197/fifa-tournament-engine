import { Router } from 'express'
import { z } from 'zod'
import { query } from '../../config/db.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { authenticate } from '../../middleware/authenticate.js'
import { authorize } from '../../middleware/authorize.js'
import { requireSubscription } from '../../middleware/requireSubscription.js'
import { HttpError } from '../../utils/httpError.js'

export const financeRouter = Router()

const financialSchema = z.object({
  tournament_id: z.number().int().positive(),
  entry_fee: z.number().nonnegative().default(0),
  sponsor_amount: z.number().nonnegative().default(0),
  expected_teams: z.number().int().nonnegative().default(0),
})

const expenseSchema = z.object({
  tournament_id: z.number().int().positive(),
  title: z.string().min(1),
  amount: z.number().nonnegative(),
})

financeRouter.use(authenticate, requireSubscription, authorize('ADMIN'))

financeRouter.post(
  '/financials',
  asyncHandler(async (req, res) => {
    const parsed = financialSchema.safeParse(req.body)
    if (!parsed.success) throw new HttpError(400, 'Invalid payload', parsed.error.issues)
    const payload = parsed.data

    const result = await query(
      `INSERT INTO tournament_financials (business_id, tournament_id, entry_fee, sponsor_amount, expected_teams)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (tournament_id) DO UPDATE
       SET entry_fee = EXCLUDED.entry_fee,
           sponsor_amount = EXCLUDED.sponsor_amount,
           expected_teams = EXCLUDED.expected_teams,
           updated_at = NOW()
       RETURNING id, tournament_id, entry_fee, sponsor_amount, expected_teams`,
      [req.user.business_id, payload.tournament_id, payload.entry_fee, payload.sponsor_amount, payload.expected_teams],
    )

    return res.status(201).json({ success: true, data: result.rows[0] })
  }),
)

financeRouter.post(
  '/expenses',
  asyncHandler(async (req, res) => {
    const parsed = expenseSchema.safeParse(req.body)
    if (!parsed.success) throw new HttpError(400, 'Invalid payload', parsed.error.issues)
    const payload = parsed.data

    const result = await query(
      `INSERT INTO tournament_expenses (business_id, tournament_id, title, amount)
       VALUES ($1, $2, $3, $4)
       RETURNING id, tournament_id, title, amount, created_at`,
      [req.user.business_id, payload.tournament_id, payload.title, payload.amount],
    )

    return res.status(201).json({ success: true, data: result.rows[0] })
  }),
)

financeRouter.get(
  '/summary/:tournamentId',
  asyncHandler(async (req, res) => {
    const tournamentId = Number(req.params.tournamentId)
    const details = await query(
      `SELECT entry_fee, sponsor_amount, expected_teams
       FROM tournament_financials
       WHERE tournament_id = $1 AND business_id = $2
       LIMIT 1`,
      [tournamentId, req.user.business_id],
    )
    if (!details.rows[0]) throw new HttpError(404, 'Financial setup not found')

    const expenseRows = await query(
      `SELECT COALESCE(SUM(amount), 0)::float AS total_costs
       FROM tournament_expenses
       WHERE tournament_id = $1 AND business_id = $2`,
      [tournamentId, req.user.business_id],
    )

    const financial = details.rows[0]
    const totalCosts = Number(expenseRows.rows[0]?.total_costs || 0)
    const totalRevenue = Number(financial.entry_fee || 0) * Number(financial.expected_teams || 0) + Number(financial.sponsor_amount || 0)
    const netProfit = totalRevenue - totalCosts
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0
    const breakEvenTeams = financial.entry_fee > 0 ? Math.ceil((totalCosts - Number(financial.sponsor_amount || 0)) / Number(financial.entry_fee || 1)) : null

    return res.json({
      success: true,
      data: {
        total_revenue: totalRevenue,
        total_costs: totalCosts,
        net_profit: netProfit,
        profit_margin: Number(profitMargin.toFixed(2)),
        break_even_teams: breakEvenTeams !== null ? Math.max(0, breakEvenTeams) : null,
      },
    })
  }),
)

