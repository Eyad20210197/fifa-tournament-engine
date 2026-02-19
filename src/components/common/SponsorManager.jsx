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
    } catch (requestError) {
      setError(requestError?.message || 'فشل رفع شعار الراعي')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-6">
      <h3 className="text-xl font-semibold">شعار الراعي</h3>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">يظهر مباشرة على شاشة العرض</p>

      {error ? <p className="mt-3 rounded-xl border border-rose-300/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p> : null}

      <div className="mt-4 flex flex-col gap-3">
        <div className="grid h-16 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-black/20">
          {sponsorLogo ? <img alt="شعار الراعي" src={sponsorLogo} className="h-full w-full object-contain" /> : <span className="text-sm text-[var(--text-secondary)]">لا يوجد شعار</span>}
        </div>

        <div className="flex flex-wrap gap-2">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(event) => onPick(event.target.files?.[0])} />
          <button className="min-h-11 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm" onClick={() => fileRef.current?.click()}>رفع</button>
          <button className="min-h-11 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm" onClick={() => setSponsorLogo(null)}>إزالة</button>
        </div>
      </div>
    </div>
  )
}
