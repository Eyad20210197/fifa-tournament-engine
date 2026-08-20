import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../auth/useAuth'
import { useLanguage } from '../../i18n/LanguageContext'
import { ROLES } from '../../auth/roles'
import { fetchTournaments } from '../../services/tournamentService'
import {
  createExpense,
  deleteExpense,
  deleteFinancialSetup,
  fetchExpenses,
  fetchFinancialSetup,
  fetchFinanceSummary,
  upsertFinancialSetup,
} from '../../services/financeService'
import AppIcon from '../../components/common/AppIcon'
import ShinyText from '../../components/reactbits/ShinyText'
import SpotlightCard from '../../components/reactbits/SpotlightCard'

export default function Finance() {
  const { role } = useAuth()
  const { t, language, isRtl } = useLanguage()
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
    hour_rate: '',
    match_duration_minutes: '',
    expense_title: '',
    expense_amount: '',
  })

  useEffect(() => {
    fetchTournaments()
      .then((data) => {
        setTournaments(data || [])
        if (data?.[0]?.id) setSelectedTournamentId(String(data[0].id))
      })
      .catch(() => setTournaments([]))
  }, [])

  async function loadFinanceData(tournamentId) {
    if (!tournamentId) return
    setLoading(true)
    setError('')
    try {
      const [setupData, summaryData, expenseRows] = await Promise.all([
        fetchFinancialSetup(Number(tournamentId)).catch(() => null),
        fetchFinanceSummary(Number(tournamentId)).catch(() => null),
        fetchExpenses(Number(tournamentId)).catch(() => []),
      ])

      setForm((state) => ({
        ...state,
        entry_fee: String(setupData?.entry_fee ?? ''),
        sponsor_amount: String(setupData?.sponsor_amount ?? ''),
        expected_teams: String(setupData?.expected_teams ?? ''),
        hour_rate: String(setupData?.hour_rate ?? ''),
        match_duration_minutes: String(setupData?.match_duration_minutes ?? ''),
      }))
      setSummary(summaryData)
      setExpenses(expenseRows || [])
    } catch (requestError) {
      setSummary(null)
      setExpenses([])
      setError(requestError?.response?.data?.message || (language === 'ar' ? 'تعذر تحميل البيانات المالية' : 'Failed to load finance data'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadFinanceData(selectedTournamentId)
  }, [selectedTournamentId])

  const kpis = useMemo(
    () => [
      { key: 'revenue', label: language === 'ar' ? 'إجمالي الإيرادات' : 'Total Revenue', value: `${(summary?.total_revenue || 0).toLocaleString()} EGP`, icon: 'dollar', color: 'text-emerald-400', border: 'border-emerald-500/30' },
      { key: 'costs', label: language === 'ar' ? 'إجمالي المصروفات' : 'Total Expenses', value: `${(summary?.total_costs || 0).toLocaleString()} EGP`, icon: 'alert', color: 'text-rose-400', border: 'border-rose-500/30' },
      { key: 'profit', label: language === 'ar' ? 'صافي الربح' : 'Net Profit', value: `${(summary?.net_profit || 0).toLocaleString()} EGP`, icon: 'trophy', color: 'text-sky-400', border: 'border-sky-500/30' },
      { key: 'margin', label: language === 'ar' ? 'هامش الربح' : 'Profit Margin', value: `${summary?.profit_margin || 0}%`, icon: 'chart', color: 'text-amber-400', border: 'border-amber-500/30' },
    ],
    [summary, language],
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
        hour_rate: Number(form.hour_rate || 0),
        match_duration_minutes: Number(form.match_duration_minutes || 0),
      })
      await loadFinanceData(selectedTournamentId)
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Failed to save financial setup')
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
        amount: Number(form.expense_amount),
      })
      setForm((state) => ({ ...state, expense_title: '', expense_amount: '' }))
      await loadFinanceData(selectedTournamentId)
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Failed to add expense')
    } finally {
      setSaving(false)
    }
  }

  async function removeExpense(expenseId) {
    if (!selectedTournamentId) return
    setSaving(true)
    setError('')
    try {
      await deleteExpense(expenseId)
      await loadFinanceData(selectedTournamentId)
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Failed to delete expense')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-6">
      {/* Top Header & Selector */}
      <SpotlightCard className="border border-white/10 bg-slate-950/80 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-400/40 bg-emerald-500/20 text-emerald-400">
              <AppIcon name="dollar" size={22} />
            </div>
            <div>
              <ShinyText text={t('navFinance')} className="text-xl font-black text-white" />
              <p className="text-xs text-slate-400">
                {language === 'ar' ? 'الإيرادات، رسوم الاشتراك، الرعاية، المصروفات، وصافي الأرباح' : 'Revenue, fees, sponsorships, operational costs, and profit'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-400 hidden sm:block">
              {language === 'ar' ? 'البطولة:' : 'Tournament:'}
            </label>
            <select
              className="rounded-xl border border-emerald-500/30 bg-slate-900/90 px-3.5 py-2 text-xs font-bold text-white focus:border-emerald-400 focus:outline-none"
              value={selectedTournamentId}
              onChange={(e) => setSelectedTournamentId(e.target.value)}
            >
              {tournaments.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </SpotlightCard>

      {error ? (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/15 p-3.5 text-xs font-bold text-rose-200">
          <AppIcon name="alert" size={16} className="text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {/* KPI Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi, idx) => (
          <SpotlightCard key={idx} className={`border ${kpi.border} bg-slate-950/80 p-5`}>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>{kpi.label}</span>
              <AppIcon name={kpi.icon} size={18} className={kpi.color} />
            </div>
            <p className="mt-2.5 text-2xl font-black text-white font-mono">
              {loading ? '--' : kpi.value}
            </p>
          </SpotlightCard>
        ))}
      </div>

      {isAdmin && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Financial Calculation Settings */}
          <SpotlightCard className="border border-white/10 bg-slate-950/80 p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-sky-400 flex items-center gap-2">
              <AppIcon name="sliders" size={16} />
              <span>{language === 'ar' ? 'معايير حسابات البطولة' : 'Financial Parameters'}</span>
            </h3>

            <form onSubmit={saveFinancialSetup} className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[11px] font-bold text-slate-300">{t('entryFee')}</label>
                <input
                  type="number"
                  className="w-full rounded-xl border border-white/15 bg-slate-900/80 px-3 py-2 text-xs text-white focus:border-sky-400 focus:outline-none"
                  value={form.entry_fee}
                  onChange={(e) => setForm((s) => ({ ...s, entry_fee: e.target.value }))}
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-bold text-slate-300">{t('sponsorAmount')}</label>
                <input
                  type="number"
                  className="w-full rounded-xl border border-white/15 bg-slate-900/80 px-3 py-2 text-xs text-white focus:border-sky-400 focus:outline-none"
                  value={form.sponsor_amount}
                  onChange={(e) => setForm((s) => ({ ...s, sponsor_amount: e.target.value }))}
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-bold text-slate-300">{t('hourRate')}</label>
                <input
                  type="number"
                  className="w-full rounded-xl border border-white/15 bg-slate-900/80 px-3 py-2 text-xs text-white focus:border-sky-400 focus:outline-none"
                  value={form.hour_rate}
                  onChange={(e) => setForm((s) => ({ ...s, hour_rate: e.target.value }))}
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-bold text-slate-300">
                  {language === 'ar' ? 'مدة المباراة (دقائق)' : 'Match Mins'}
                </label>
                <input
                  type="number"
                  className="w-full rounded-xl border border-white/15 bg-slate-900/80 px-3 py-2 text-xs text-white focus:border-sky-400 focus:outline-none"
                  value={form.match_duration_minutes}
                  onChange={(e) => setForm((s) => ({ ...s, match_duration_minutes: e.target.value }))}
                />
              </div>

              <div className="sm:col-span-2 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-1.5 rounded-xl border border-sky-400 bg-sky-500 px-5 py-2 text-xs font-bold text-slate-950 shadow-[0_0_15px_rgba(56,189,248,0.3)] transition hover:bg-sky-400 disabled:opacity-50"
                >
                  <AppIcon name="save" size={14} />
                  <span>{saving ? t('loading') : (language === 'ar' ? 'حفظ معايير المالية' : 'Save Parameters')}</span>
                </button>
              </div>
            </form>
          </SpotlightCard>

          {/* Add Expense Form */}
          <SpotlightCard className="border border-white/10 bg-slate-950/80 p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2">
              <AppIcon name="plus" size={16} />
              <span>{language === 'ar' ? 'إضافة بند مصروف جديد' : 'Log New Expense Item'}</span>
            </h3>

            <form onSubmit={addExpense} className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[11px] font-bold text-slate-300">
                  {language === 'ar' ? 'وصف المصروف' : 'Expense Description'}
                </label>
                <input
                  className="w-full rounded-xl border border-white/15 bg-slate-900/80 px-3 py-2 text-xs text-white focus:border-sky-400 focus:outline-none"
                  placeholder={language === 'ar' ? 'مشروبات، حكام، صيانة...' : 'e.g. Referee compensation, snacks'}
                  value={form.expense_title}
                  onChange={(e) => setForm((s) => ({ ...s, expense_title: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-bold text-slate-300">
                  {language === 'ar' ? 'المبلغ (ج.م)' : 'Amount (EGP)'}
                </label>
                <input
                  type="number"
                  className="w-full rounded-xl border border-white/15 bg-slate-900/80 px-3 py-2 text-xs text-white focus:border-sky-400 focus:outline-none"
                  placeholder="500"
                  value={form.expense_amount}
                  onChange={(e) => setForm((s) => ({ ...s, expense_amount: e.target.value }))}
                  required
                />
              </div>

              <div className="sm:col-span-2 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/20 px-5 py-2 text-xs font-bold text-rose-200 transition hover:bg-rose-500/30 disabled:opacity-50"
                >
                  <AppIcon name="plus" size={14} />
                  <span>{saving ? t('loading') : (language === 'ar' ? 'تسجيل المصروف' : 'Add Expense')}</span>
                </button>
              </div>
            </form>
          </SpotlightCard>
        </div>
      )}

      {/* Expenses Table */}
      <SpotlightCard className="border border-white/10 bg-slate-950/80 p-0 overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {language === 'ar' ? 'سجل المصروفات' : 'Expenses Ledger'} ({expenses.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className={`min-w-full text-xs ${isRtl ? 'text-right' : 'text-left'}`}>
            <thead className="border-b border-white/10 bg-slate-900/80 text-slate-400 uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">{language === 'ar' ? 'بند المصروف' : 'Item'}</th>
                <th className="px-4 py-3">{language === 'ar' ? 'المبلغ' : 'Amount'}</th>
                <th className="px-4 py-3">{language === 'ar' ? 'التاريخ' : 'Date'}</th>
                {isAdmin && <th className="px-4 py-3">{language === 'ar' ? 'إجراء' : 'Action'}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {expenses.length ? (
                expenses.map((item) => (
                  <tr key={item.id} className="transition hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-bold text-white">{item.title}</td>
                    <td className="px-4 py-3 text-rose-300 font-mono font-bold">{item.amount?.toLocaleString()} EGP</td>
                    <td className="px-4 py-3 text-slate-400">{new Date(item.created_at).toLocaleDateString()}</td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => removeExpense(item.id)}
                          className="text-rose-400 hover:text-rose-300"
                        >
                          <AppIcon name="trash" size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={4}>
                    {language === 'ar' ? 'لا توجد مصروفات مسجلة لهذه البطولة.' : 'No expenses recorded for this tournament.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SpotlightCard>
    </section>
  )
}
