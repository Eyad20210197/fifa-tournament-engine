import { useMemo, useRef, useState } from 'react'
import { useTournamentStore } from '../../store/tournamentStore'
import { SponsorTicker } from '../live/SponsorTicker'
import { uploadSponsorLogo } from '../../services/mediaService'

export function SponsorManager() {
  const sponsorUrls = useTournamentStore((s) => s.sponsor.urls)
  const setSponsorUrls = useTournamentStore((s) => s.setSponsorUrls)
  const uploadRef = useRef(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const normalizedUrls = useMemo(
    () => sponsorUrls.map((item) => String(item || '').trim()).filter(Boolean),
    [sponsorUrls],
  )

  async function onUpload(file) {
    if (!file) return
    setSaving(true)
    setError('')
    try {
      const uploaded = await uploadSponsorLogo(file)
      const value = String(uploaded?.url || '').trim()
      if (!value) throw new Error('Invalid Cloudinary URL')
      if (normalizedUrls.includes(value)) {
        setError('Logo already added')
        return
      }
      setSponsorUrls([...normalizedUrls, value])
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError?.message || 'Failed to upload sponsor logo')
    } finally {
      setSaving(false)
      if (uploadRef.current) uploadRef.current.value = ''
    }
  }

  function removeUrl(url) {
    setSponsorUrls(normalizedUrls.filter((item) => item !== url))
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-6">
      <h3 className="text-xl font-semibold">Sponsor Logos</h3>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">Upload logos directly to Cloudinary and show them in ticker.</p>

      <div className="mt-4 flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input ref={uploadRef} type="file" accept="image/*" className="hidden" onChange={(event) => onUpload(event.target.files?.[0])} />
          <button
            className="min-h-11 rounded-xl bg-[var(--primary-color)] px-4 py-2 text-sm font-semibold text-[#07162b] disabled:opacity-60"
            onClick={() => uploadRef.current?.click()}
            disabled={saving}
          >
            {saving ? 'Uploading...' : 'Upload Sponsor Logo'}
          </button>
          <p className="text-xs text-[var(--text-secondary)]">PNG/JPG/WEBP/GIF/SVG - max 10MB</p>
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
                  Remove
                </button>
              </div>
            ))
          ) : (
            <p className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-[var(--text-secondary)]">No sponsor logos yet.</p>
          )}
        </div>

        <SponsorTicker sponsorUrls={normalizedUrls} speed={80} pauseOnHover />
      </div>
    </div>
  )
}
