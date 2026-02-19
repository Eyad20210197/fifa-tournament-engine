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
        setError(requestError?.response?.data?.message || 'تعذر تحميل بيانات الهوية التجارية')
      })
  }, [])

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">تخصيص الهوية</h2>
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <ReadOnlyField label="اسم العلامة" value={branding?.brand_name || '--'} />
        <ReadOnlyField label="اللون الأساسي" value={branding?.primary_color || 'var(--primary-color)'} />
        <ReadOnlyField label="اللون الثانوي" value={branding?.secondary_color || 'var(--secondary-color)'} />
        <ReadOnlyField label="رابط الشعار" value={branding?.logo_url || '--'} />
      </div>

      <p className="text-xs text-[var(--text-secondary)]">ألوان الهوية والشعار تطبق تلقائيا على جميع واجهات النشاط.</p>
    </section>
  )
}

function ReadOnlyField({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs text-[var(--text-secondary)]">{label}</p>
      <p className="mt-2 break-all text-sm">{value}</p>
    </div>
  )
}
