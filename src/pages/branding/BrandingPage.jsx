import { useEffect, useRef, useState } from 'react'
import { fetchBusinessBranding, updateMyBusinessBranding } from '../../services/brandingService'
import { uploadBrandingAnimatedLogo, uploadBrandingLogo } from '../../services/mediaService'

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
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingAnimated, setUploadingAnimated] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const logoRef = useRef(null)
  const animatedRef = useRef(null)

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
        setError(requestError?.response?.data?.message || 'Failed to load branding data')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  async function onUploadLogo(file) {
    if (!file) return
    setUploadingLogo(true)
    setError('')
    setMessage('')
    try {
      const result = await uploadBrandingLogo(file)
      const url = String(result?.url || '').trim()
      if (!url) throw new Error('Missing uploaded logo URL')
      setForm((state) => ({ ...state, logo_url: url }))
      setMessage('Logo uploaded successfully')
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError?.message || 'Failed to upload logo')
    } finally {
      setUploadingLogo(false)
      if (logoRef.current) logoRef.current.value = ''
    }
  }

  async function onUploadAnimated(file) {
    if (!file) return
    setUploadingAnimated(true)
    setError('')
    setMessage('')
    try {
      const result = await uploadBrandingAnimatedLogo(file)
      const url = String(result?.path || '').trim()
      if (!url) throw new Error('Missing uploaded animated logo URL')
      setForm((state) => ({ ...state, animated_logo_url: url }))
      setMessage('Animated logo uploaded successfully')
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError?.message || 'Failed to upload animated logo')
    } finally {
      setUploadingAnimated(false)
      if (animatedRef.current) animatedRef.current.value = ''
    }
  }

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
      setMessage('Branding saved successfully')
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Failed to save branding')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Branding</h2>
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-300">{message}</p> : null}

      <form className="grid gap-3 sm:grid-cols-2" onSubmit={onSave}>
        <Field
          label="Brand Name"
          value={form.brand_name}
          onChange={(event) => setForm((state) => ({ ...state, brand_name: event.target.value }))}
          placeholder="Brand name"
        />
        <Field
          label="Primary Color"
          value={form.primary_color}
          onChange={(event) => setForm((state) => ({ ...state, primary_color: event.target.value }))}
          placeholder="#c9a227"
        />
        <Field
          label="Secondary Color"
          value={form.secondary_color}
          onChange={(event) => setForm((state) => ({ ...state, secondary_color: event.target.value }))}
          placeholder="#f6d365"
        />

        <label className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:col-span-2">
          <p className="text-xs text-[var(--text-secondary)]">Logo</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={(event) => onUploadLogo(event.target.files?.[0])} />
            <button type="button" onClick={() => logoRef.current?.click()} className="min-h-11 rounded-xl bg-[var(--primary-color)] px-4 py-2 text-sm font-semibold text-[#07162b] disabled:opacity-60" disabled={uploadingLogo || loading}>
              {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
            </button>
            {form.logo_url ? <span className="text-xs text-[var(--text-secondary)] truncate">{form.logo_url}</span> : null}
          </div>
        </label>

        <label className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:col-span-2">
          <p className="text-xs text-[var(--text-secondary)]">Animated Logo (MP4/WEBM/MOV)</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input ref={animatedRef} type="file" accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov" className="hidden" onChange={(event) => onUploadAnimated(event.target.files?.[0])} />
            <button type="button" onClick={() => animatedRef.current?.click()} className="min-h-11 rounded-xl bg-[var(--primary-color)] px-4 py-2 text-sm font-semibold text-[#07162b] disabled:opacity-60" disabled={uploadingAnimated || loading}>
              {uploadingAnimated ? 'Uploading...' : 'Upload Animated Logo'}
            </button>
            {form.animated_logo_url ? <span className="text-xs text-[var(--text-secondary)] truncate">{form.animated_logo_url}</span> : null}
          </div>
        </label>

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={saving || loading}
            className="min-h-11 rounded-2xl bg-[var(--primary-color)] px-4 py-2 text-sm font-semibold text-[#07162b] disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Branding'}
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
