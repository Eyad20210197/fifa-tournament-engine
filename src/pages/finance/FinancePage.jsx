import { useState } from 'react'
import { fetchFinanceSummary } from '../../services/financeService'

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
      setError(requestError?.response?.data?.message || 'فشل تحميل الملخص المالي')
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">المالية</h1>
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="rounded-xl border border-white/10 bg-black/30 px-3 py-2"
          value={tournamentId}
          onChange={(event) => setTournamentId(event.target.value)}
          placeholder="رقم البطولة"
        />
        <button className="rounded-xl bg-[#c9a227] px-4 py-2 text-sm font-semibold text-[#07162b]" onClick={loadSummary}>
          تحميل الملخص
        </button>
      </div>
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      {summary ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {Object.entries(summary).map(([key, value]) => (
            <div key={key} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-white/60">{key}</p>
              <p className="mt-1 text-lg font-semibold">{String(value)}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

