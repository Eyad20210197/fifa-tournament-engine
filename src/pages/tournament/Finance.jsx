import { useEffect, useMemo, useState } from 'react'
import { fetchTournaments } from '../../services/tournamentService'
import { fetchFinanceSummary } from '../../services/financeService'

function formatMoney(value) {
  const amount = Number(value || 0)
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(amount)
}

export default function Finance() {
  const [tournaments, setTournaments] = useState([])
  const [selectedTournamentId, setSelectedTournamentId] = useState('')
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchTournaments()
      .then((data) => {
        setTournaments(data)
        if (data[0]?.id) {
          setSelectedTournamentId(String(data[0].id))
        }
      })
      .catch(() => setTournaments([]))
  }, [])

  useEffect(() => {
    if (!selectedTournamentId) return

    async function loadSummary() {
      setLoading(true)
      setError('')
      try {
        const data = await fetchFinanceSummary(Number(selectedTournamentId))
        setSummary(data)
      } catch (requestError) {
        setSummary(null)
        setError(requestError?.response?.data?.message || 'Failed to load finance summary')
      } finally {
        setLoading(false)
      }
    }

    void loadSummary()
  }, [selectedTournamentId])

  const cards = useMemo(
    () => [
      { label: 'Revenue', value: summary?.total_revenue, format: 'currency' },
      { label: 'Costs', value: summary?.total_costs, format: 'currency' },
      { label: 'Net Profit', value: summary?.net_profit, format: 'currency' },
      { label: 'Margin', value: summary?.profit_margin, format: 'percent' },
      { label: 'Break-even Teams', value: summary?.break_even_teams, format: 'number' },
    ],
    [summary],
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Finance Summary</h1>
        <select
          className="rounded-xl border border-white/10 bg-black/30 px-3 py-2"
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

      {loading ? <p className="text-sm text-white/70">Loading finance data...</p> : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      {summary ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {cards.map((item) => (
            <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-white/60">{item.label}</p>
              <p className="mt-2 text-lg font-semibold">
                {item.format === 'currency'
                  ? formatMoney(item.value)
                  : item.format === 'percent'
                    ? `${Number(item.value || 0).toFixed(2)}%`
                    : String(item.value ?? '--')}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
