import { useMemo, useState } from 'react'
import { useAblyChannel } from '../../hooks/useAblyChannel'
import { matchChannel, tournamentChannel } from '../../services/channelNames'
import { publishMockMatchUpdate } from '../../services/liveStateService'

export default function AblyTestPanel() {
  const [tournamentId, setTournamentId] = useState('')
  const [matchId, setMatchId] = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)

  const tournamentChannelName = useMemo(() => tournamentChannel(tournamentId), [tournamentId])
  const matchChannelName = useMemo(() => matchChannel(matchId), [matchId])

  const pushMessage = (entry) => {
    setMessages((current) => [entry, ...current].slice(0, 100))
  }

  useAblyChannel(tournamentChannelName, 'score:update', (data) => {
    pushMessage({ scope: 'tournament', event: 'score:update', data, at: new Date().toISOString() })
  })

  useAblyChannel(matchChannelName, 'score:update', (data) => {
    pushMessage({ scope: 'match', event: 'score:update', data, at: new Date().toISOString() })
  })
  useAblyChannel(matchChannelName, 'match:update', (data) => {
    pushMessage({ scope: 'match', event: 'match:update', data, at: new Date().toISOString() })
  })

  async function sendMock() {
    if (!tournamentId || !matchId) return
    setLoading(true)
    try {
      const payload = await publishMockMatchUpdate({
        tournamentId: Number(tournamentId),
        matchId: Number(matchId),
        homeScore: Math.floor(Math.random() * 8),
        awayScore: Math.floor(Math.random() * 8),
      })
      pushMessage({ scope: 'api', event: 'mock:published', data: payload, at: new Date().toISOString() })
    } catch (error) {
      pushMessage({
        scope: 'api',
        event: 'mock:error',
        data: { message: error?.response?.data?.message || error?.message || 'failed' },
        at: new Date().toISOString(),
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="mx-auto mt-6 w-full max-w-4xl rounded-2xl border border-white/10 bg-white/5 p-4">
      <h2 className="text-lg font-semibold">Ably Test Panel</h2>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">Subscribe to channels and publish a mock match update.</p>

      <div className="mt-3 grid gap-2 md:grid-cols-3">
        <input
          className="min-h-11 rounded-xl border border-white/15 bg-black/25 px-3 py-2"
          placeholder="Tournament ID"
          value={tournamentId}
          onChange={(event) => setTournamentId(event.target.value)}
        />
        <input
          className="min-h-11 rounded-xl border border-white/15 bg-black/25 px-3 py-2"
          placeholder="Match ID"
          value={matchId}
          onChange={(event) => setMatchId(event.target.value)}
        />
        <button
          className="min-h-11 rounded-xl bg-[var(--primary-color)] px-4 py-2 text-sm font-semibold text-[#07162b] disabled:opacity-60"
          type="button"
          disabled={loading || !tournamentId || !matchId}
          onClick={sendMock}
        >
          {loading ? 'Publishing...' : 'Publish Mock Update'}
        </button>
      </div>

      <div className="mt-4 max-h-[360px] overflow-auto rounded-xl border border-white/10 bg-black/20 p-3 text-xs">
        {messages.length === 0 ? (
          <p className="text-[var(--text-secondary)]">No messages yet.</p>
        ) : (
          messages.map((item, index) => (
            <pre key={`${item.at}-${index}`} className="mb-2 whitespace-pre-wrap rounded-lg border border-white/10 bg-black/30 p-2">
              [{item.at}] {item.scope} {item.event}
              {'\n'}
              {JSON.stringify(item.data, null, 2)}
            </pre>
          ))
        )}
      </div>
    </section>
  )
}
