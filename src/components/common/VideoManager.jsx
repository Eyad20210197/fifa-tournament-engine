import { useEffect, useRef, useState } from 'react'
import { deleteOpeningVideo, fetchOpeningVideo, uploadOpeningVideo } from '../../services/mediaService'

const MAX_VIDEO_BYTES = 260 * 1024 * 1024
const ALLOWED_MIME_TYPES = new Set(['video/mp4'])

export function VideoManager() {
  const fileRef = useRef(null)
  const [openingVideo, setOpeningVideo] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    void loadVideo()
  }, [])

  async function loadVideo() {
    setLoading(true)
    setError('')
    try {
      const metadata = await fetchOpeningVideo()
      setOpeningVideo(metadata)
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Failed to load opening video metadata')
    } finally {
      setLoading(false)
    }
  }

  function validateVideo(file) {
    if (!file) return 'Select a file'
    const type = String(file.type || '').toLowerCase()
    if (!ALLOWED_MIME_TYPES.has(type)) return 'Opening Screen Intro Video must be MP4'
    if (file.size > MAX_VIDEO_BYTES) return 'Video file exceeds 260MB'
    return null
  }

  async function onUpload(file) {
    const validationError = validateVideo(file)
    if (validationError) {
      setError(validationError)
      return
    }

    setSaving(true)
    setError('')
    try {
      const saved = await uploadOpeningVideo(file)
      setOpeningVideo(saved)
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Failed to upload opening video')
    } finally {
      setSaving(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function onDelete() {
    if (!openingVideo?.path) return
    setSaving(true)
    setError('')
    try {
      await deleteOpeningVideo()
      setOpeningVideo(null)
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Failed to delete opening video')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-6">
      <h3 className="text-xl font-semibold">Opening Screen Intro Video</h3>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">MP4 only (up to 260MB)</p>

      {error ? <p className="mt-3 rounded-xl border border-rose-300/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p> : null}
      {loading ? <p className="mt-3 text-sm text-[var(--text-secondary)]">Loading opening video metadata...</p> : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="video/mp4,.mp4"
          className="hidden"
          onChange={(event) => onUpload(event.target.files?.[0])}
        />
        <button
          className="min-h-11 rounded-xl bg-[var(--primary-color)] px-4 py-2 text-sm font-semibold text-[#07162b] disabled:opacity-60"
          onClick={() => fileRef.current?.click()}
          disabled={saving}
        >
          {openingVideo?.path ? 'Replace Video' : 'Upload Video'}
        </button>
        <button
          className="min-h-11 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-100 disabled:opacity-60"
          onClick={onDelete}
          disabled={saving || !openingVideo?.path}
        >
          Delete
        </button>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3">
        {openingVideo?.path ? (
          <video
            src={openingVideo.path}
            autoPlay
            loop
            muted
            playsInline
            controls
            preload="metadata"
            className="w-full rounded-xl bg-black"
            poster="/icons/icon.svg"
          />
        ) : (
          <p className="text-sm text-[var(--text-secondary)]">No opening video uploaded yet.</p>
        )}
      </div>
    </div>
  )
}
