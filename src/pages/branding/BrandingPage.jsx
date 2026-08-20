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
import { useLanguage } from '../../i18n/LanguageContext'
import AppIcon from '../../components/common/AppIcon'
import ShinyText from '../../components/reactbits/ShinyText'
import SpotlightCard from '../../components/reactbits/SpotlightCard'

const MAX_ANIMATED_BYTES = 260 * 1024 * 1024
const MAX_OPENING_BYTES = 260 * 1024 * 1024
const OPENING_MIME_TYPES = new Set(['video/mp4'])
const ANIMATED_MIME_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime'])

const emptyForm = {
  brand_name: '',
  primary_color: '#38bdf8',
  secondary_color: '#f59e0b',
  logo_url: '',
  animated_logo_url: '',
}

export default function BrandingPage() {
  const { t, language } = useLanguage()
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

  function applyColorsToDom(primary, secondary) {
    const root = document.documentElement
    if (primary) root.style.setProperty('--primary-color', primary)
    if (secondary) root.style.setProperty('--secondary-color', secondary)
  }

  useEffect(() => {
    setLoading(true)
    setMediaLoading(true)
    Promise.all([fetchBusinessBranding(), fetchOpeningVideo(), fetchBrandingAnimatedLogo()])
      .then(([brandingData, openingData, animatedData]) => {
        const primary = brandingData?.primary_color || '#38bdf8'
        const secondary = brandingData?.secondary_color || '#f59e0b'
        setForm({
          brand_name: brandingData?.brand_name || '',
          primary_color: primary,
          secondary_color: secondary,
          logo_url: brandingData?.logo_url || '',
          animated_logo_url: brandingData?.animated_logo_url || '',
        })
        applyColorsToDom(primary, secondary)
        setOpeningVideo(openingData?.path ? openingData : null)
        setAnimatedVideo(animatedData?.path ? animatedData : null)
      })
      .catch((requestError) => {
        setError(requestError?.response?.data?.message || (language === 'ar' ? 'تعذر تحميل بيانات الهوية' : 'Failed to load branding data'))
      })
      .finally(() => {
        setLoading(false)
        setMediaLoading(false)
      })
  }, [])

  function handleColorChange(key, value) {
    setForm((s) => {
      const next = { ...s, [key]: value }
      applyColorsToDom(next.primary_color, next.secondary_color)
      return next
    })
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
      const nextUrl = result?.url || result?.path || ''
      setForm((s) => ({ ...s, logo_url: nextUrl }))
      setMessage(language === 'ar' ? 'تم رفع الشعار بنجاح!' : 'Logo uploaded successfully!')
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Failed to upload logo')
    } finally {
      setUploadingLogo(false)
    }
  }

  async function onUploadOpening(file) {
    if (!file) return
    if (!OPENING_MIME_TYPES.has(String(file.type || '').toLowerCase())) {
      setError(language === 'ar' ? 'فيديو الافتتاح يجب أن يكون بصيغة MP4' : 'Intro video must be MP4')
      return
    }
    setUploadingOpening(true)
    setOpeningProgress(0)
    setError('')
    setMessage('')
    try {
      const uploaded = await uploadOpeningVideo(file, {
        onProgress: (percent) => setOpeningProgress(percent),
      })
      setOpeningVideo(uploaded)
      setMessage(language === 'ar' ? 'تم رفع فيديو الافتتاح بنجاح!' : 'Intro video uploaded successfully!')
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to upload opening video')
    } finally {
      setUploadingOpening(false)
    }
  }

  async function onDeleteOpening() {
    setDeletingOpening(true)
    setError('')
    try {
      await deleteOpeningVideo()
      setOpeningVideo(null)
      setMessage(language === 'ar' ? 'تم حذف فيديو الافتتاح' : 'Opening video removed')
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to delete opening video')
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
      applyColorsToDom(updated?.primary_color, updated?.secondary_color)
      setMessage(language === 'ar' ? 'تم حفظ الهوية وتطبيق الألوان بنجاح!' : 'Branding saved and applied across entire system!')
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Failed to save branding')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-6">
      <SpotlightCard className="border border-white/10 bg-slate-950/80 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-sky-400/40 bg-sky-500/20 text-sky-400">
            <AppIcon name="palette" size={22} />
          </div>
          <div>
            <ShinyText text={t('navBranding')} className="text-xl font-black text-white" />
            <p className="text-xs text-slate-400">
              {language === 'ar' ? 'تخصيص اسم الصالة، ألوان الهوية، الشعار، وفيديو الافتتاح' : 'Custom arena name, brand colors, logo, and cinema intro video'}
            </p>
          </div>
        </div>
      </SpotlightCard>

      {error ? (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/15 p-3.5 text-xs font-bold text-rose-200">
          <AppIcon name="alert" size={16} className="text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {message ? (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/15 p-3.5 text-xs font-bold text-emerald-200">
          <AppIcon name="check" size={16} className="text-emerald-400 shrink-0" />
          <span>{message}</span>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Color Palette & Brand Name */}
        <SpotlightCard className="border border-white/10 bg-slate-950/80 p-6 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-sky-400 flex items-center gap-2">
            <AppIcon name="palette" size={16} />
            <span>{language === 'ar' ? 'ألوان وسمات الصالة' : 'Arena Colors & Theme'}</span>
          </h3>

          <form onSubmit={onSave} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-300">
                {language === 'ar' ? 'اسم الصالة أو العلامة' : 'Arena Brand Name'}
              </label>
              <input
                className="w-full rounded-xl border border-white/15 bg-slate-900/80 px-3.5 py-2.5 text-xs text-white focus:border-sky-400 focus:outline-none"
                value={form.brand_name}
                onChange={(e) => setForm((s) => ({ ...s, brand_name: e.target.value }))}
                placeholder="FIFA Gaming Lounge"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-300">
                  {language === 'ar' ? 'اللون الأساسي (Primary)' : 'Primary Accent'}
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-slate-900/80 px-2 py-1.5">
                  <input
                    type="color"
                    className="h-8 w-8 cursor-pointer rounded-lg border-0 bg-transparent"
                    value={form.primary_color || '#38bdf8'}
                    onChange={(e) => handleColorChange('primary_color', e.target.value)}
                  />
                  <input
                    type="text"
                    className="w-full bg-transparent text-xs font-mono text-white focus:outline-none"
                    value={form.primary_color}
                    onChange={(e) => handleColorChange('primary_color', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-300">
                  {language === 'ar' ? 'اللون الثانوي (Gold/Glow)' : 'Secondary Accent'}
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-slate-900/80 px-2 py-1.5">
                  <input
                    type="color"
                    className="h-8 w-8 cursor-pointer rounded-lg border-0 bg-transparent"
                    value={form.secondary_color || '#f59e0b'}
                    onChange={(e) => handleColorChange('secondary_color', e.target.value)}
                  />
                  <input
                    type="text"
                    className="w-full bg-transparent text-xs font-mono text-white focus:outline-none"
                    value={form.secondary_color}
                    onChange={(e) => handleColorChange('secondary_color', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Live Theme Preview Box */}
            <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4 space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                {language === 'ar' ? 'معاينة حية للمظهر' : 'Live Theme Preview'}
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  style={{ backgroundColor: form.primary_color || '#38bdf8' }}
                  className="rounded-lg px-4 py-1.5 text-xs font-black text-black shadow-lg"
                >
                  Primary Action
                </button>
                <button
                  type="button"
                  style={{ borderColor: form.secondary_color || '#f59e0b', color: form.secondary_color || '#f59e0b' }}
                  className="rounded-lg border px-4 py-1.5 text-xs font-bold"
                >
                  Secondary Glow
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 rounded-xl border border-sky-400 bg-sky-500 px-6 py-2.5 text-xs font-bold text-slate-950 shadow-[0_0_20px_rgba(56,189,248,0.3)] transition hover:bg-sky-400 disabled:opacity-50"
            >
              <AppIcon name="save" size={14} />
              <span>{saving ? t('loading') : (language === 'ar' ? 'حفظ وتطبيق المظهر' : 'Save & Apply Theme')}</span>
            </button>
          </form>
        </SpotlightCard>

        {/* Media & Videos */}
        <SpotlightCard className="border border-white/10 bg-slate-950/80 p-6 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-sky-400 flex items-center gap-2">
            <AppIcon name="sparkles" size={16} />
            <span>{language === 'ar' ? 'الشعار وفيديو الافتتاح' : 'Logo & Intro Cinema Media'}</span>
          </h3>

          {/* Logo Upload */}
          <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4 space-y-2.5">
            <label className="text-xs font-bold text-slate-300 block">
              {language === 'ar' ? 'شعار الصالة (PNG / SVG / JPG)' : 'Brand Logo (PNG / SVG)'}
            </label>
            <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={(e) => onUploadLogo(e.target.files?.[0])} />
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => logoRef.current?.click()}
                disabled={uploadingLogo}
                className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/10"
              >
                <AppIcon name="download" size={14} />
                <span>{uploadingLogo ? `${t('loading')} ${logoProgress}%` : (language === 'ar' ? 'رفع الشعار' : 'Upload Logo')}</span>
              </button>
              {form.logo_url && (
                <div className="h-9 w-9 rounded-lg border border-white/15 bg-black/40 overflow-hidden">
                  <img src={form.logo_url} alt="Logo" className="h-full w-full object-contain" />
                </div>
              )}
            </div>
          </div>

          {/* Intro Video Upload */}
          <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4 space-y-2.5">
            <label className="text-xs font-bold text-slate-300 block">
              {language === 'ar' ? 'فيديو افتتاح شاشات العرض (16:9 MP4)' : 'Opening Cinema Video (16:9 MP4)'}
            </label>
            <input ref={openingRef} type="file" accept="video/mp4" className="hidden" onChange={(e) => onUploadOpening(e.target.files?.[0])} />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openingRef.current?.click()}
                disabled={uploadingOpening}
                className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/10"
              >
                <AppIcon name="download" size={14} />
                <span>{uploadingOpening ? `${t('loading')} ${openingProgress}%` : (language === 'ar' ? 'رفع فيديو MP4' : 'Upload Video')}</span>
              </button>
              {openingVideo?.path && (
                <button
                  type="button"
                  onClick={onDeleteOpening}
                  disabled={deletingOpening}
                  className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/20"
                >
                  <AppIcon name="trash" size={13} />
                </button>
              )}
            </div>

            {openingVideo?.path ? (
              <video
                src={openingVideo.path}
                controls
                muted
                className="w-full rounded-xl border border-white/10 bg-black mt-2 max-h-[160px] object-cover"
              />
            ) : null}
          </div>
        </SpotlightCard>
      </div>
    </section>
  )
}
