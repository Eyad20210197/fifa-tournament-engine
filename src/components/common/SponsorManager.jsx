import { useMemo, useState } from 'react'
import { useTournamentStore } from '../../store/tournamentStore'
import { SponsorTicker } from '../live/SponsorTicker'

export function SponsorManager() {
  const sponsorUrls = useTournamentStore((s) => s.sponsor.urls)
  const setSponsorUrls = useTournamentStore((s) => s.setSponsorUrls)
  const [inputUrl, setInputUrl] = useState('')
  const [error, setError] = useState('')

  const normalizedUrls = useMemo(
    () => sponsorUrls.map((item) => String(item || '').trim()).filter(Boolean),
    [sponsorUrls],
  )

  function addUrl() {
    const value = String(inputUrl || '').trim()
    if (!value) return
    if (!/^https?:\/\//i.test(value)) {
      setError('يجب إدخال رابط URL صالح يبدأ بـ http:// أو https://')
      return
    }
    if (normalizedUrls.includes(value)) {
      setError('الرابط مضاف مسبقا')
      return
    }
    setError('')
    setSponsorUrls([...normalizedUrls, value])
    setInputUrl('')
  }

  function removeUrl(url) {
    setSponsorUrls(normalizedUrls.filter((item) => item !== url))
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-6">
      <h3 className="text-xl font-semibold">روابط الرعاة</h3>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">يتم عرض الروابط مباشرة في شريط البث</p>

      <div className="mt-4 flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={inputUrl}
            onChange={(event) => setInputUrl(event.target.value)}
            placeholder="https://example.com/sponsor-logo.webp"
            className="min-h-11 flex-1 rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm outline-none focus:border-[var(--primary-color)]/60"
          />
          <button className="min-h-11 rounded-xl bg-[var(--primary-color)] px-4 py-2 text-sm font-semibold text-[#07162b]" onClick={addUrl}>
            إضافة
          </button>
        </div>

        {error ? <p className="rounded-xl border border-rose-300/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p> : null}

        <div className="space-y-2">
          {normalizedUrls.length ? (
            normalizedUrls.map((url) => (
              <div key={url} className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                <img src={url} alt="Sponsor" width={72} height={36} loading="lazy" decoding="async" className="h-9 w-[72px] object-contain" />
                <p className="min-w-0 flex-1 truncate text-sm">{url}</p>
                <button
                  className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-1 text-xs text-rose-100"
                  onClick={() => removeUrl(url)}
                >
                  حذف
                </button>
              </div>
            ))
          ) : (
            <p className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-[var(--text-secondary)]">لا توجد روابط رعاية بعد.</p>
          )}
        </div>

        <SponsorTicker sponsorUrls={normalizedUrls} speed={80} pauseOnHover />
      </div>
    </div>
  )
}
