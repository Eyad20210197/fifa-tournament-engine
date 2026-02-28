import fs from 'node:fs/promises'
import path from 'node:path'
import { Router } from 'express'
import multer from 'multer'
import { z } from 'zod'
import { env } from '../../config/env.js'
import { query } from '../../config/db.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { authenticate } from '../../middleware/authenticate.js'
import { authorize } from '../../middleware/authorize.js'
import { HttpError } from '../../utils/httpError.js'

const MAX_VIDEO_BYTES = 200 * 1024 * 1024
const ALLOWED_TYPES = new Set(['opening'])
const ALLOWED_MIME_TYPES = new Set(['video/mp4', 'video/webm'])
const MIME_TO_EXT = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
}

const uploadTypeSchema = z.object({
  type: z.string().min(1),
})

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, env.mediaVideosDir)
  },
  filename(req, file, cb) {
    const ext = MIME_TO_EXT[String(file.mimetype || '').toLowerCase()]
    const businessId = Number(req.user?.business_id || 0)
    const random = Math.random().toString(36).slice(2, 8)
    cb(null, `video-${businessId}-${Date.now()}-${random}.${ext || 'bin'}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: MAX_VIDEO_BYTES, files: 1 },
  fileFilter(req, file, cb) {
    if (!ALLOWED_MIME_TYPES.has(String(file.mimetype || '').toLowerCase())) {
      return cb(new HttpError(400, 'Only .mp4 and .webm are allowed'))
    }
    return cb(null, true)
  },
})

export const mediaRouter = Router()
export const uploadVideoRouter = Router()

mediaRouter.use(authenticate)
uploadVideoRouter.use(authenticate)

mediaRouter.get(
  '/opening',
  authorize('SUPER_ADMIN', 'ADMIN', 'STAFF'),
  asyncHandler(async (req, res) => {
    const result = await query(
      `SELECT id, type, path, mime_type, size_bytes, created_at, updated_at
       FROM media_assets
       WHERE business_id = $1 AND type = 'opening'
       LIMIT 1`,
      [req.user.business_id],
    )
    return res.json({ success: true, data: result.rows[0] || null })
  }),
)

mediaRouter.delete(
  '/opening',
  authorize('SUPER_ADMIN', 'ADMIN'),
  asyncHandler(async (req, res) => {
    const deleted = await query(
      `DELETE FROM media_assets
       WHERE business_id = $1 AND type = 'opening'
       RETURNING path`,
      [req.user.business_id],
    )

    const oldPath = deleted.rows[0]?.path
    if (oldPath) {
      await safeDeleteFile(oldPath)
    }

    return res.json({ success: true, data: { deleted: Boolean(oldPath) } })
  }),
)

uploadVideoRouter.post(
  '/upload-video',
  authorize('SUPER_ADMIN', 'ADMIN'),
  (req, res, next) => {
    void fs.mkdir(env.mediaVideosDir, { recursive: true })
      .then(() => next())
      .catch(next)
  },
  (req, res, next) => {
    upload.single('video')(req, res, (error) => {
      if (!error) return next()
      if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
        return next(new HttpError(400, 'Video exceeds 200MB'))
      }
      return next(error)
    })
  },
  asyncHandler(async (req, res) => {
    const parsed = uploadTypeSchema.safeParse(req.body || {})
    if (!parsed.success) throw new HttpError(400, 'Invalid payload', parsed.error.issues)
    const type = String(parsed.data.type || '').trim().toLowerCase()
    if (!ALLOWED_TYPES.has(type)) throw new HttpError(400, 'Unsupported video type')

    const file = req.file
    if (!file) throw new HttpError(400, 'Video file is required')
    const mimeType = String(file.mimetype || '').toLowerCase()
    if (!ALLOWED_MIME_TYPES.has(mimeType)) throw new HttpError(400, 'Only .mp4 and .webm are allowed')

    const publicPath = `/media/videos/${file.filename}`
    const existing = await query(
      `SELECT path
       FROM media_assets
       WHERE business_id = $1 AND type = $2
       LIMIT 1`,
      [req.user.business_id, type],
    )

    await query(
      `INSERT INTO media_assets (business_id, type, path, mime_type, size_bytes)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (business_id, type)
       DO UPDATE SET path = EXCLUDED.path, mime_type = EXCLUDED.mime_type, size_bytes = EXCLUDED.size_bytes, updated_at = NOW()
       RETURNING id, type, path, mime_type, size_bytes, created_at, updated_at`,
      [req.user.business_id, type, publicPath, mimeType, Number(file.size || 0)],
    )

    const oldPath = existing.rows[0]?.path
    if (oldPath && oldPath !== publicPath) {
      await safeDeleteFile(oldPath)
    }

    const result = await query(
      `SELECT id, type, path, mime_type, size_bytes, created_at, updated_at
       FROM media_assets
       WHERE business_id = $1 AND type = $2
       LIMIT 1`,
      [req.user.business_id, type],
    )

    return res.status(201).json({ success: true, data: result.rows[0] || null })
  }),
)

async function safeDeleteFile(publicPath) {
  const fileName = path.basename(String(publicPath || ''))
  if (!fileName) return
  const absolutePath = path.join(env.mediaVideosDir, fileName)
  try {
    await fs.unlink(absolutePath)
  } catch {
    // ignore missing file
  }
}
