import { useEffect, useRef, useState } from 'react'
import { fetchBusinessBranding, updateMyBusinessBranding } from '../../services/brandingService'
import {
  deleteBrandingAnimatedLogo,
  deleteOpeningVideo,
  fetchBrandingAnimatedLogo,
  fetchOpeningVideo,
  uploadBrandingAnimatedLogo,
  uploadBrandingLogo,
  uploadOpeningVideo,
} from '../../services/mediaService'

const MAX_ANIMATED_BYTES = 260 * 1024 * 1024
const MAX_OPENING_BYTES = 260 * 1024 * 1024
const OPENING_MIME_TYPES = new Set(['video/mp4'])
const ANIMATED_MIME_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime'])

const emptyForm = {
  brand_name: '',
  primary_color: '',
  secondary_color: '',
  logo_url: '',
  animated_logo_url: '',
}

export default function BrandingPage() {
  const [form, setForm] = useState(emptyForm)
  const [openingVideo, setOpeningVideo] = useState(null)
  const [animatedVideo, setAnimatedVideo] = useState(null)

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [mediaLoading, setMediaLoading] = useState(false)

  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingAnimated, setUploadingAnimated] = useState(false)
  const [uploadingOpening, setUploadingOpening] = useState(false)
  const [logoProgress, setLogoProgress] = useState(0)
  const [animatedProgress, setAnimatedProgress] = useState(0)
  const [openingProgress, setOpeningProgress] = useState(0)
  const [deletingAnimated, setDeletingAnimated] = useState(false)
  const [deletingOpening, setDeletingOpening] = useState(false)

  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const logoRef = useRef(null)
  const animatedRef = useRef(null)
  const openingRef = useRef(null)

  useEffect(() => {
    setLoading(true)
    setMediaLoading(true)
    Promise.all([fetchBusinessBranding(), fetchOpeningVideo(), fetchBrandingAnimatedLogo()])
      .then(([brandingData, openingData, animatedData]) => {
        setForm({
          brand_name: brandingData?.brand_name || '',
          primary_color: brandingData?.primary_color || '',
          secondary_color: brandingData?.secondary_color || '',
          logo_url: brandingData?.logo_url || '',
          animated_logo_url: brandingData?.animated_logo_url || '',
        })
        setOpeningVideo(openingData?.path ? openingData : null)
        setAnimatedVideo(animatedData?.path ? animatedData : null)
      })
      .catch((requestError) => {
        setError(requestError?.response?.data?.message || 'Failed to load branding data')
      })
      .finally(() => {
        setLoading(false)
        setMediaLoading(false)
      })
  }, [])

  function validateOpeningVideo(file) {
    if (!file) return 'Select an opening video file.'
    const mime = String(file.type || '').toLowerCase()
    if (!OPENING_MIME_TYPES.has(mime)) return 'Opening Screen Intro Video must be MP4.'
    if (file.size > MAX_OPENING_BYTES) return 'Opening video exceeds 260MB.'
    return null
  }

  function validateAnimatedVideo(file) {
    if (!file) return 'Select an animated logo file.'
    const mime = String(file.type || '').toLowerCase()
    if (!ANIMATED_MIME_TYPES.has(mime)) return 'Animated logo must be MOV, MP4, or WEBM.'
    if (file.size > MAX_ANIMATED_BYTES) return 'Animated logo exceeds 260MB.'
    return null
  }

  async function onUploadLogo(file) {
    if (!file) return
    setUploadingLogo(true)
    setLogoProgress(0)
    setError('')
    setMessage('')
    try {
      const result = await uploadBrandingLogo(file, {
        onProgress: (percent) => setLogoProgress(percent),
      })
      const url = String(result?.url || '').trim()
      if (!url) throw new Error('Missing uploaded logo URL')
      setForm((state) => ({ ...state, logo_url: url }))
      setMessage('Brand logo uploaded successfully.')
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError?.message || 'Failed to upload logo')
    } finally {
      setUploadingLogo(false)
      setLogoProgress(0)
      if (logoRef.current) logoRef.current.value = ''
    }
  }

  async function onUploadAnimated(file) {
    const validationError = validateAnimatedVideo(file)
    if (validationError) {
      setError(validationError)
      return
    }

    setUploadingAnimated(true)
    setAnimatedProgress(0)
    setError('')
    setMessage('')
    try {
      const result = await uploadBrandingAnimatedLogo(file, {
        onProgress: (percent) => setAnimatedProgress(percent),
      })
      setAnimatedVideo(result?.path ? result : null)
      setForm((state) => ({ ...state, animated_logo_url: String(result?.path || '').trim() }))
      setMessage('Animated Logo updated. Remember to click "Save Branding" to apply changes.')
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError?.message || 'Failed to upload animated logo')
    } finally {
      setUploadingAnimated(false)
      setAnimatedProgress(0)
      if (animatedRef.current) animatedRef.current.value = ''
    }
  }

  async function onDeleteAnimated() {
    if (!animatedVideo?.path) return
    setDeletingAnimated(true)
    setError('')
    setMessage('')
    try {
      await deleteBrandingAnimatedLogo()
      setAnimatedVideo(null)
      setForm((state) => ({ ...state, animated_logo_url: '' }))
      setMessage('Animated Logo (Desktop Top Bar Only) deleted successfully.')
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Failed to delete animated logo')
    } finally {
      setDeletingAnimated(false)
    }
  }

  async function onUploadOpening(file) {
    const validationError = validateOpeningVideo(file)
    if (validationError) {
      setError(validationError)
      return
    }

    setUploadingOpening(true)
    setOpeningProgress(0)
    setError('')
    setMessage('')
    try {
      const result = await uploadOpeningVideo(file, {
        onProgress: (percent) => setOpeningProgress(percent),
      })
      setOpeningVideo(result?.path ? result : null)
      setMessage('Opening Screen Intro Video updated successfully.')
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError?.message || 'Failed to upload opening video')
    } finally {
      setUploadingOpening(false)
      setOpeningProgress(0)
      if (openingRef.current) openingRef.current.value = ''
    }
  }

  async function onDeleteOpening() {
    if (!openingVideo?.path) return
    setDeletingOpening(true)
    setError('')
    setMessage('')
    try {
      await deleteOpeningVideo()
      setOpeningVideo(null)
      setMessage('Opening Screen Intro Video deleted successfully.')
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Failed to delete opening video')
    } finally {
      setDeletingOpening(false)
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
      setMessage('Branding saved successfully.')
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Failed to save branding')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Brand Identity</h2>
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
          <p className="text-xs text-[var(--text-secondary)]">Brand Logo</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={(event) => onUploadLogo(event.target.files?.[0])} />
            <button
              type="button"
              onClick={() => logoRef.current?.click()}
              className="min-h-11 rounded-xl bg-[var(--primary-color)] px-4 py-2 text-sm font-semibold text-[#07162b] disabled:opacity-60"
              disabled={uploadingLogo || loading}
            >
              {uploadingLogo ? `Uploading... ${logoProgress}%` : form.logo_url ? 'Replace Logo' : 'Upload Logo'}
            </button>
            {form.logo_url ? <span className="text-xs text-[var(--text-secondary)] truncate">{form.logo_url}</span> : null}
          </div>
          {uploadingLogo ? <p className="mt-2 text-xs text-[var(--text-secondary)]">Upload progress: {logoProgress}%</p> : null}
        </label>

        <MediaCard
          title="Animated Logo (Desktop Top Bar Only)"
          subtitle="Formats: MOV / MP4 / WEBM. Max 260MB."
          loading={mediaLoading}
          saving={uploadingAnimated || deletingAnimated}
          hasMedia={Boolean(animatedVideo?.path)}
          onUploadClick={() => animatedRef.current?.click()}
          onDelete={onDeleteAnimated}
          uploadLabel={uploadingAnimated ? `Uploading... ${animatedProgress}%` : animatedVideo?.path ? 'Replace' : 'Upload'}
          deleteLabel={deletingAnimated ? 'Deleting...' : 'Delete'}
          progress={animatedProgress}
          showProgress={uploadingAnimated}
          preview={
            animatedVideo?.path ? (
              <video
                src={animatedVideo.path}
                autoPlay
                loop
                controls
                muted
                playsInline
                preload="metadata"
                className="w-full rounded-xl bg-black"
              />
            ) : (
              <p className="text-sm text-[var(--text-secondary)]">No animated logo uploaded.</p>
            )
          }
        >
          <input
            ref={animatedRef}
            type="file"
            accept="video/quicktime,video/mp4,video/webm,.mov,.mp4,.webm"
            className="hidden"
            onChange={(event) => onUploadAnimated(event.target.files?.[0])}
          />
        </MediaCard>

        <MediaCard
          title="Opening Screen Intro Video"
          subtitle="Format: MP4 only. Max 260MB."
          loading={mediaLoading}
          saving={uploadingOpening || deletingOpening}
          hasMedia={Boolean(openingVideo?.path)}
          onUploadClick={() => openingRef.current?.click()}
          onDelete={onDeleteOpening}
          uploadLabel={uploadingOpening ? `Uploading... ${openingProgress}%` : openingVideo?.path ? 'Replace' : 'Upload'}
          deleteLabel={deletingOpening ? 'Deleting...' : 'Delete'}
          progress={openingProgress}
          showProgress={uploadingOpening}
          preview={
            openingVideo?.path ? (
              <video
                src={openingVideo.path}
                autoPlay
                loop
                controls
                muted
                playsInline
                preload="metadata"
                className="w-full rounded-xl bg-black"
              />
            ) : (
              <p className="text-sm text-[var(--text-secondary)]">No opening intro video uploaded.</p>
            )
          }
        >
          <input
            ref={openingRef}
            type="file"
            accept="video/mp4,.mp4"
            className="hidden"
            onChange={(event) => onUploadOpening(event.target.files?.[0])}
          />
        </MediaCard>

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

function MediaCard({
  title,
  subtitle,
  loading,
  saving,
  hasMedia,
  onUploadClick,
  onDelete,
  uploadLabel,
  deleteLabel,
  progress = 0,
  showProgress = false,
  preview,
  children,
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:col-span-2">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs text-[var(--text-secondary)]">{subtitle}</p>

      {children}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onUploadClick}
          disabled={saving || loading}
          className="min-h-11 rounded-xl bg-[var(--primary-color)] px-4 py-2 text-sm font-semibold text-[#07162b] disabled:opacity-60"
        >
          {uploadLabel}
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={saving || loading || !hasMedia}
          className="min-h-11 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-100 disabled:opacity-60"
        >
          {deleteLabel}
        </button>
      </div>
      {showProgress ? <p className="mt-2 text-xs text-[var(--text-secondary)]">Upload progress: {progress}%</p> : null}

      <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3">
        {loading ? <p className="text-sm text-[var(--text-secondary)]">Loading media metadata...</p> : preview}
      </div>
    </div>
  )
}
