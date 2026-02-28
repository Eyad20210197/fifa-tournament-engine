import { Router } from 'express'
import multer from 'multer'
import { z } from 'zod'
import { env } from '../../config/env.js'
import { query } from '../../config/db.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { authenticate } from '../../middleware/authenticate.js'
import { authorize } from '../../middleware/authorize.js'
import { HttpError } from '../../utils/httpError.js'
import { deleteFromCloudinary, uploadBufferToCloudinary } from '../../services/cloudinary.service.js'

const MAX_VIDEO_BYTES = 200 * 1024 * 1024
const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const ALLOWED_VIDEO_TYPES = new Set(['opening', 'branding_animated_logo'])
const ALLOWED_IMAGE_TYPES = new Set(['sponsor', 'branding_logo'])
const ALLOWED_MIME_TYPES = new Set(['video/mp4', 'video/webm'])
const ALLOWED_ANIMATED_MIME_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime'])
const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'])
const MIME_TO_EXT = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
}

const uploadTypeSchema = z.object({
  type: z.string().min(1),
})

const uploadVideo = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_VIDEO_BYTES, files: 1 },
  fileFilter(req, file, cb) {
    const mime = String(file.mimetype || '').toLowerCase()
    if (!ALLOWED_MIME_TYPES.has(mime) && !ALLOWED_ANIMATED_MIME_TYPES.has(mime)) {
      return cb(new HttpError(400, 'Only video files are allowed'))
    }
    return cb(null, true)
  },
})

const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
  fileFilter(req, file, cb) {
    const mime = String(file.mimetype || '').toLowerCase()
    if (!ALLOWED_IMAGE_MIME_TYPES.has(mime)) {
      return cb(new HttpError(400, 'Only image files are allowed'))
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
       RETURNING public_id, resource_type`,
      [req.user.business_id],
    )

    const oldPublicId = deleted.rows[0]?.public_id
    const oldResourceType = deleted.rows[0]?.resource_type
    if (oldPublicId) {
      await deleteFromCloudinary(oldPublicId, oldResourceType).catch(() => null)
    }

    return res.json({ success: true, data: { deleted: Boolean(oldPublicId) } })
  }),
)

uploadVideoRouter.post(
  '/upload-video',
  authorize('SUPER_ADMIN', 'ADMIN'),
  (req, res, next) => {
    uploadVideo.single('video')(req, res, (error) => {
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
    if (!ALLOWED_VIDEO_TYPES.has(type)) throw new HttpError(400, 'Unsupported video type')

    const file = req.file
    if (!file) throw new HttpError(400, 'Video file is required')
    const mimeType = String(file.mimetype || '').toLowerCase()
    if (!ALLOWED_MIME_TYPES.has(mimeType) && !ALLOWED_ANIMATED_MIME_TYPES.has(mimeType)) {
      throw new HttpError(400, 'Only video files are allowed')
    }

    const existing = await query(
      `SELECT id, public_id, resource_type, path
       FROM media_assets
       WHERE business_id = $1 AND type = $2
       LIMIT 1`,
      [req.user.business_id, type],
    )

    const ext = MIME_TO_EXT[mimeType] || 'bin'
    const uploadResult = await uploadBufferToCloudinary({
      buffer: file.buffer,
      mimeType,
      folder: type === 'opening' ? env.cloudinaryFolderVideo : env.cloudinaryFolderBranding,
      resourceType: 'video',
      publicId: `${type}-b${req.user.business_id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`,
    })

    await query(
      `INSERT INTO media_assets (business_id, type, path, mime_type, size_bytes, public_id, resource_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (business_id, type)
       DO UPDATE SET
         path = EXCLUDED.path,
         mime_type = EXCLUDED.mime_type,
         size_bytes = EXCLUDED.size_bytes,
         public_id = EXCLUDED.public_id,
         resource_type = EXCLUDED.resource_type,
         updated_at = NOW()`,
      [req.user.business_id, type, uploadResult.secure_url, mimeType, Number(file.size || 0), uploadResult.public_id, 'video'],
    )

    const oldPublicId = existing.rows[0]?.public_id
    if (oldPublicId && oldPublicId !== uploadResult.public_id) {
      await deleteFromCloudinary(oldPublicId, existing.rows[0]?.resource_type || 'video').catch(() => null)
    }

    if (type === 'branding_animated_logo') {
      await query(
        `UPDATE businesses
         SET animated_logo_url = $1, updated_at = NOW()
         WHERE id = $2`,
        [uploadResult.secure_url, req.user.business_id],
      )
    }

    const result = await query(
      `SELECT id, type, path, mime_type, size_bytes, public_id, resource_type, created_at, updated_at
       FROM media_assets
       WHERE business_id = $1 AND type = $2
       LIMIT 1`,
      [req.user.business_id, type],
    )
    return res.status(201).json({ success: true, data: result.rows[0] || null })
  }),
)

mediaRouter.post(
  '/upload-logo',
  authorize('SUPER_ADMIN', 'ADMIN'),
  (req, res, next) => {
    uploadImage.single('image')(req, res, (error) => {
      if (!error) return next()
      if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
        return next(new HttpError(400, 'Image exceeds 10MB'))
      }
      return next(error)
    })
  },
  asyncHandler(async (req, res) => {
    const parsed = uploadTypeSchema.safeParse(req.body || {})
    if (!parsed.success) throw new HttpError(400, 'Invalid payload', parsed.error.issues)
    const type = String(parsed.data.type || '').trim().toLowerCase()
    if (!ALLOWED_IMAGE_TYPES.has(type)) throw new HttpError(400, 'Unsupported logo type')

    const file = req.file
    if (!file) throw new HttpError(400, 'Image file is required')
    const mimeType = String(file.mimetype || '').toLowerCase()
    if (!ALLOWED_IMAGE_MIME_TYPES.has(mimeType)) throw new HttpError(400, 'Only image files are allowed')

    const uploadResult = await uploadBufferToCloudinary({
      buffer: file.buffer,
      mimeType,
      folder: type === 'sponsor' ? env.cloudinaryFolderSponsor : env.cloudinaryFolderBranding,
      resourceType: 'image',
      publicId: `${type}-b${req.user.business_id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    })

    if (type === 'branding_logo') {
      const existing = await query(
        `SELECT public_id, resource_type
         FROM media_assets
         WHERE business_id = $1 AND type = 'branding_logo'
         LIMIT 1`,
        [req.user.business_id],
      )

      await query(
        `INSERT INTO media_assets (business_id, type, path, mime_type, size_bytes, public_id, resource_type)
         VALUES ($1, 'branding_logo', $2, $3, $4, $5, 'image')
         ON CONFLICT (business_id, type)
         DO UPDATE SET
           path = EXCLUDED.path,
           mime_type = EXCLUDED.mime_type,
           size_bytes = EXCLUDED.size_bytes,
           public_id = EXCLUDED.public_id,
           resource_type = EXCLUDED.resource_type,
           updated_at = NOW()`,
        [req.user.business_id, uploadResult.secure_url, mimeType, Number(file.size || 0), uploadResult.public_id],
      )

      await query(
        `UPDATE businesses
         SET logo_url = $1, updated_at = NOW()
         WHERE id = $2`,
        [uploadResult.secure_url, req.user.business_id],
      )

      const oldPublicId = existing.rows[0]?.public_id
      if (oldPublicId && oldPublicId !== uploadResult.public_id) {
        await deleteFromCloudinary(oldPublicId, existing.rows[0]?.resource_type || 'image').catch(() => null)
      }
    }

    return res.status(201).json({
      success: true,
      data: {
        url: uploadResult.secure_url,
        public_id: uploadResult.public_id,
        resource_type: 'image',
        type,
      },
    })
  }),
)
