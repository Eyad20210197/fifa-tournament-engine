import { useRef, useState } from 'react'
import { useTournamentStore } from '../../store/tournamentStore'
import { readFileAsDataURL } from '../../utils/files'

export function SponsorManager() {
  const sponsorLogo = useTournamentStore((s) => s.sponsor.logoBase64)
  const setSponsorLogo = useTournamentStore((s) => s.setSponsorLogo)
  const [error, setError] = useState(null)
  const fileRef = useRef(null)

  async function onPick(file) {
    if (!file) return
    setError(null)
    try {
      const dataUrl = await readFileAsDataURL(file)
      setSponsorLogo(dataUrl)
    } catch (e) {
      setError(e?.message || 'فشل رفع شعار الراعي')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
      <div className="text-xs text-white/60">الراعي</div>
      <div className="mt-2 text-xl font-semibold text-white/90">شعار الراعي</div>
      <div className="mt-1 text-sm text-white/70">سيظهر في شاشة العرض فوراً.</div>

      {error ? (
        <div className="mt-4 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      <div className="mt-5 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="grid h-14 w-28 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-black/20">
            {sponsorLogo ? (
              <img alt="شعار الراعي" src={sponsorLogo} className="h-full w-full object-contain" />
            ) : (
              <div className="text-xs text-white/50">لا يوجد</div>
            )}
          </div>
          <div className="text-xs text-white/60">يفضل PNG بخلفية شفافة.</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileRef}
            className="hidden"
            type="file"
            accept="image/*"
            onChange={(e) => onPick(e.target.files?.[0])}
          />
          <button
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
            onClick={() => fileRef.current?.click()}
          >
            رفع الشعار
          </button>
          <button
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
            onClick={() => setSponsorLogo(null)}
          >
            إزالة
          </button>
        </div>
      </div>
    </div>
  )
}
