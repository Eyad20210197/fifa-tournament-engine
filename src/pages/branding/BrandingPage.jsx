import { useEffect, useState } from 'react'
import { fetchBusinessBranding, updateMyBusinessBranding } from '../../services/brandingService'

const emptyForm = {
  brand_name: '',
  primary_color: '',
  secondary_color: '',
  logo_url: '',
  animated_logo_url: '',
}

export default function BrandingPage() {
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    setLoading(true)
    fetchBusinessBranding()
      .then((data) => {
        setForm({
          brand_name: data?.brand_name || '',
          primary_color: data?.primary_color || '',
          secondary_color: data?.secondary_color || '',
          logo_url: data?.logo_url || '',
          animated_logo_url: data?.animated_logo_url || '',
        })
      })
      .catch((requestError) => {
        setError(requestError?.response?.data?.message || 'تعذر تحميل بيانات الهوية التجارية')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  async function onSave(event) {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const payload = {
        brand_name: form.brand_name.trim() || null,
        primary_color: form.primary_color.trim() || null,
        secondary_color: form.secondary_color.trim() || null,
        logo_url: form.logo_url.trim() || null,
        animated_logo_url: form.animated_logo_url.trim() || null,
      }
      const updated = await updateMyBusinessBranding(payload)
      setForm({
        brand_name: updated?.brand_name || '',
        primary_color: updated?.primary_color || '',
        secondary_color: updated?.secondary_color || '',
        logo_url: updated?.logo_url || '',
        animated_logo_url: updated?.animated_logo_url || '',
      })
      setMessage('تم حفظ الهوية بنجاح')
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'تعذر حفظ بيانات الهوية التجارية')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">تخصيص الهوية</h2>
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-300">{message}</p> : null}

      <form className="grid gap-3 sm:grid-cols-2" onSubmit={onSave}>
        <Field
          label="اسم العلامة"
          value={form.brand_name}
          onChange={(event) => setForm((state) => ({ ...state, brand_name: event.target.value }))}
          placeholder="اسم الهوية"
        />
        <Field
          label="اللون الأساسي"
          value={form.primary_color}
          onChange={(event) => setForm((state) => ({ ...state, primary_color: event.target.value }))}
          placeholder="#c9a227"
        />
        <Field
          label="اللون الثانوي"
          value={form.secondary_color}
          onChange={(event) => setForm((state) => ({ ...state, secondary_color: event.target.value }))}
          placeholder="#f6d365"
        />
        <Field
          label="رابط الشعار"
          value={form.logo_url}
          onChange={(event) => setForm((state) => ({ ...state, logo_url: event.target.value }))}
          placeholder="https://..."
        />
        <Field
          label="رابط الشعار المتحرك (MOV/MP4)"
          value={form.animated_logo_url}
          onChange={(event) => setForm((state) => ({ ...state, animated_logo_url: event.target.value }))}
          placeholder="https://.../logo.mov"
          className="sm:col-span-2"
        />

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={saving || loading}
            className="min-h-11 rounded-2xl bg-[var(--primary-color)] px-4 py-2 text-sm font-semibold text-[#07162b] disabled:opacity-60"
          >
            {saving ? 'جار الحفظ...' : 'حفظ الهوية'}
          </button>
        </div>
      </form>
    </section>
  )
}

function Field({ label, value, onChange, placeholder, className = '' }) {
  return (
    <label className={`rounded-2xl border border-white/10 bg-white/5 p-4 ${className}`.trim()}>
      <p className="text-xs text-[var(--text-secondary)]">{label}</p>
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="mt-2 min-h-11 w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm outline-none focus:border-[var(--primary-color)]/60"
      />
    </label>
  )
}
