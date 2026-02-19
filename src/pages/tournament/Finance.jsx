import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../auth/useAuth'
import { ROLES } from '../../auth/roles'
import { fetchTournaments } from '../../services/tournamentService'
import {
  createExpense,
  deleteExpense,
  deleteFinancialSetup,
  fetchExpenses,
  fetchFinanceSummary,
  upsertFinancialSetup,
} from '../../services/financeService'
import { formatArabicCurrency, formatArabicDateTime, formatArabicNumber, formatArabicPercent } from '../../utils/format'

export default function Finance() {
  const { role } = useAuth()
  const isAdmin = role === ROLES.ADMIN

  const [tournaments, setTournaments] = useState([])
  const [selectedTournamentId, setSelectedTournamentId] = useState('')
  const [summary, setSummary] = useState(null)
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    entry_fee: '',
    sponsor_amount: '',
    expected_teams: '',
    expense_title: '',
    expense_amount: '',
  })

  useEffect(() => {
    fetchTournaments()
      .then((data) => {
        setTournaments(data)
        if (data[0]?.id) setSelectedTournamentId(String(data[0].id))
      })
      .catch(() => setTournaments([]))
  }, [])

  async function loadFinanceData(tournamentId) {
    if (!tournamentId) return
    setLoading(true)
    setError('')
    try {
      const [summaryData, expenseRows] = await Promise.all([
        fetchFinanceSummary(Number(tournamentId)).catch(() => null),
        fetchExpenses(Number(tournamentId)).catch(() => []),
      ])
      setSummary(summaryData)
      setExpenses(expenseRows || [])
    } catch (requestError) {
      setSummary(null)
      setExpenses([])
      setError(requestError?.response?.data?.message || 'تعذر تحميل البيانات المالية')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadFinanceData(selectedTournamentId)
  }, [selectedTournamentId])

  const cards = useMemo(
    () => [
      { key: 'revenue', label: 'إجمالي الإيرادات', value: formatArabicCurrency(summary?.total_revenue || 0) },
      { key: 'costs', label: 'إجمالي المصروفات', value: formatArabicCurrency(summary?.total_costs || 0) },
      { key: 'profit', label: 'صافي الربح', value: formatArabicCurrency(summary?.net_profit || 0) },
      { key: 'margin', label: 'نسبة الربح', value: formatArabicPercent(summary?.profit_margin || 0) },
      { key: 'break', label: 'نقطة التعادل', value: `${formatArabicNumber(summary?.break_even_teams || 0)} فريق` },
    ],
    [summary],
  )

  async function saveFinancialSetup(event) {
    event.preventDefault()
    if (!selectedTournamentId) return

    setSaving(true)
    setError('')
    try {
      await upsertFinancialSetup({
        tournament_id: Number(selectedTournamentId),
        entry_fee: Number(form.entry_fee || 0),
        sponsor_amount: Number(form.sponsor_amount || 0),
        expected_teams: Number(form.expected_teams || 0),
      })
      await loadFinanceData(selectedTournamentId)
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'تعذر حفظ الإعداد المالي')
    } finally {
      setSaving(false)
    }
  }

  async function addExpense(event) {
    event.preventDefault()
    if (!selectedTournamentId) return

    setSaving(true)
    setError('')
    try {
      await createExpense({
        tournament_id: Number(selectedTournamentId),
        title: form.expense_title.trim(),
        amount: Number(form.expense_amount || 0),
      })
      setForm((state) => ({ ...state, expense_title: '', expense_amount: '' }))
      await loadFinanceData(selectedTournamentId)
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'تعذر إضافة المصروف')
    } finally {
      setSaving(false)
    }
  }

  async function removeExpense(expenseId) {
    setSaving(true)
    setError('')
    try {
      await deleteExpense(expenseId)
      await loadFinanceData(selectedTournamentId)
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'تعذر حذف المصروف')
    } finally {
      setSaving(false)
    }
  }

  async function clearFinancialSetup() {
    if (!selectedTournamentId) return
    setSaving(true)
    setError('')
    try {
      await deleteFinancialSetup(Number(selectedTournamentId))
      await loadFinanceData(selectedTournamentId)
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'تعذر حذف الإعداد المالي')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">لوحة المؤشرات المالية</h2>
        <select
          className="min-h-11 rounded-2xl border border-white/15 bg-black/25 px-3 py-2"
          value={selectedTournamentId}
          onChange={(event) => setSelectedTournamentId(event.target.value)}
        >
          {tournaments.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>

      {!isAdmin ? (
        <p className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-[var(--text-secondary)]">
          وضع العرض فقط: يمكن لمشرف المنصة مشاهدة المؤشرات المالية دون تعديلها.
        </p>
      ) : null}

      {loading ? <p className="text-sm text-[var(--text-secondary)]">جار تحميل البيانات المالية...</p> : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((item) => (
          <article key={item.key} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-[var(--text-secondary)]">{item.label}</p>
            <p className="mt-2 text-lg font-semibold text-[var(--secondary-color)]">{item.value}</p>
          </article>
        ))}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-sm text-[var(--text-secondary)]">مقارنة الإيرادات مقابل المصروفات</p>
        <SimpleFinanceChart revenue={summary?.total_revenue || 0} costs={summary?.total_costs || 0} />
      </div>

      {isAdmin ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <form className="rounded-2xl border border-white/10 bg-white/5 p-4" onSubmit={saveFinancialSetup}>
            <p className="text-base font-semibold">إعدادات المالية</p>
            <div className="mt-3 grid gap-3">
              <Field
                placeholder="رسوم التسجيل"
                value={form.entry_fee}
                onChange={(event) => setForm((state) => ({ ...state, entry_fee: event.target.value }))}
              />
              <Field
                placeholder="مبلغ الرعاية"
                value={form.sponsor_amount}
                onChange={(event) => setForm((state) => ({ ...state, sponsor_amount: event.target.value }))}
              />
              <Field
                placeholder="عدد الفرق المتوقع"
                value={form.expected_teams}
                onChange={(event) => setForm((state) => ({ ...state, expected_teams: event.target.value }))}
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={saving}
                className="min-h-11 rounded-2xl bg-[var(--primary-color)] px-4 py-2 text-sm font-semibold text-[#07162b] disabled:opacity-60"
              >
                حفظ الإعداد
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={clearFinancialSetup}
                className="min-h-11 rounded-2xl border border-rose-300/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-200 disabled:opacity-60"
              >
                حذف الإعداد
              </button>
            </div>
          </form>

          <form className="rounded-2xl border border-white/10 bg-white/5 p-4" onSubmit={addExpense}>
            <p className="text-base font-semibold">إضافة مصروف</p>
            <div className="mt-3 grid gap-3">
              <Field
                placeholder="عنوان المصروف"
                value={form.expense_title}
                onChange={(event) => setForm((state) => ({ ...state, expense_title: event.target.value }))}
                required
              />
              <Field
                placeholder="المبلغ"
                value={form.expense_amount}
                onChange={(event) => setForm((state) => ({ ...state, expense_amount: event.target.value }))}
                required
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="mt-3 min-h-11 rounded-2xl bg-[var(--primary-color)] px-4 py-2 text-sm font-semibold text-[#07162b] disabled:opacity-60"
            >
              إضافة المصروف
            </button>
          </form>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
        <table className="min-w-full text-right text-sm">
          <thead className="bg-white/5 text-[var(--text-secondary)]">
            <tr>
              <th className="px-4 py-3">العنوان</th>
              <th className="px-4 py-3">المبلغ</th>
              <th className="px-4 py-3">التاريخ</th>
              {isAdmin ? <th className="px-4 py-3">إجراءات</th> : null}
            </tr>
          </thead>
          <tbody>
            {expenses.length ? (
              expenses.map((item) => (
                <tr key={item.id} className="border-t border-white/10">
                  <td className="px-4 py-3">{item.title}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{formatArabicCurrency(item.amount)}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{formatArabicDateTime(item.created_at)}</td>
                  {isAdmin ? (
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => removeExpense(item.id)}
                        className="rounded-xl border border-rose-300/40 bg-rose-500/10 px-3 py-1 text-xs text-rose-200 disabled:opacity-60"
                      >
                        حذف
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-8 text-center text-[var(--text-secondary)]" colSpan={isAdmin ? 4 : 3}>
                  لا توجد مصروفات حتى الآن.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function Field({ value, onChange, placeholder, required = false }) {
  return (
    <input
      className="min-h-11 rounded-2xl border border-white/15 bg-black/25 px-3 py-2"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
    />
  )
}

function SimpleFinanceChart({ revenue, costs }) {
  const max = Math.max(1, revenue, costs)
  const revenueHeight = Math.round((revenue / max) * 180)
  const costHeight = Math.round((costs / max) * 180)

  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_260px]">
      <div className="h-56 rounded-2xl border border-white/10 bg-black/20 p-4">
        <svg viewBox="0 0 600 220" className="h-full w-full" role="img" aria-label="مخطط مالي">
          <line x1="50" y1="190" x2="560" y2="190" stroke="rgba(255,255,255,0.25)" strokeWidth="2" />
          <rect x="140" y={190 - revenueHeight} width="120" height={revenueHeight} rx="12" fill="rgba(201,162,39,0.92)" />
          <rect x="340" y={190 - costHeight} width="120" height={costHeight} rx="12" fill="rgba(78,130,190,0.9)" />
          <text x="200" y="210" textAnchor="middle" fill="rgba(248,244,232,0.85)" fontSize="16">
            الإيرادات
          </text>
          <text x="400" y="210" textAnchor="middle" fill="rgba(248,244,232,0.85)" fontSize="16">
            المصروفات
          </text>
        </svg>
      </div>

      <div className="space-y-2 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm">
        <p className="text-[var(--text-secondary)]">الإيرادات: {formatArabicCurrency(revenue)}</p>
        <p className="text-[var(--text-secondary)]">المصروفات: {formatArabicCurrency(costs)}</p>
        <p className="text-[var(--text-secondary)]">الفرق: {formatArabicCurrency(revenue - costs)}</p>
      </div>
    </div>
  )
}

