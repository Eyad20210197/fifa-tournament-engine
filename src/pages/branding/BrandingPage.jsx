import { useEffect, useState } from 'react'
import { fetchBusinessBranding } from '../../services/brandingService'

export default function BrandingPage() {
  const [branding, setBranding] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchBusinessBranding()
      .then((data) => setBranding(data))
      .catch((requestError) => {
        setBranding(null)
        setError(requestError?.response?.data?.message || '??? ????? ?????? ??????? ????????')
      })
  }, [])

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">??????? ????????</h1>
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <ReadOnlyField label="?????" value={branding?.brand_name || '--'} />
        <ReadOnlyField label="????? ???????" value={branding?.primary_color || 'var(--primary-color)'} />
        <ReadOnlyField label="????? ???????" value={branding?.secondary_color || 'var(--secondary-color)'} />
        <ReadOnlyField label="??????" value={branding?.logo_url || '--'} />
      </div>

      <p className="text-xs text-white/60">????? ?????? ??????? ???????? ??? ?? ?????? ??????? ???????.</p>
    </div>
  )
}

function ReadOnlyField({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs text-white/60">{label}</p>
      <p className="mt-2 break-all text-sm">{value}</p>
    </div>
  )
}
