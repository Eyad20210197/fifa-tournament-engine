import { useState } from 'react'
import { fetchFinanceSummary } from '../../services/financeService'
import { formatArabicCurrency, formatArabicNumber, formatArabicPercent } from '../../utils/format'

export default function FinancePage() {
  const [tournamentId, setTournamentId] = useState('')
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState('')

  async function loadSummary() {
    setError('')
    try {
      const data = await fetchFinanceSummary(Number(tournamentId))
      setSummary(data)
    } catch (requestError) {
      setSummary(null)
      setError(requestError?.response?.data?.message || 'تعذر تحميل الملخص المالي')
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">المالية</h1>
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="min-h-11 rounded-xl border border-white/10 bg-black/30 px-3 py-2"
          value={tournamentId}
          onChange={(event) => setTournamentId(event.target.value)}
          placeholder="رقم البطولة"
        />
        <button className="min-h-11 rounded-xl bg-[var(--primary-color)] px-4 py-2 text-sm font-semibold text-[#07162b]" onClick={loadSummary}>
          تحميل الملخص
        </button>
      </div>
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      {summary ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Info label="إجمالي الإيرادات" value={formatArabicCurrency(summary.total_revenue)} />
          <Info label="إجمالي المصروفات" value={formatArabicCurrency(summary.total_costs)} />
          <Info label="تكلفة التشغيل" value={formatArabicCurrency(summary.operating_costs)} />
          <Info label="صافي الربح" value={formatArabicCurrency(summary.net_profit)} />
          <Info label="نسبة الربح" value={formatArabicPercent(summary.profit_margin)} />
          <Info label="نقطة التعادل" value={formatArabicNumber(summary.break_even_teams)} />
        </div>
      ) : null}
    </div>
  )
}

function Info({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs text-[var(--text-secondary)]">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  )
}
