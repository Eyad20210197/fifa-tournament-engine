import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import { Router } from 'express'
import multer from 'multer'
import { z } from 'zod'
import { env } from '../../config/env.js'
import { query, withTransaction } from '../../config/db.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { authenticate } from '../../middleware/authenticate.js'
import { authorize } from '../../middleware/authorize.js'
import { HttpError } from '../../utils/httpError.js'
import { deleteFromCloudinary, uploadFileToCloudinary, uploadLargeFileToCloudinary } from '../../services/cloudinary.service.js'

const MAX_VIDEO_BYTES = 260 * 1024 * 1024
const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const VIDEO_UPLOAD_CHUNK_BYTES = 6000000
const TEMP_UPLOAD_DIR = path.join(os.tmpdir(), 'ramadan-media-uploads')

const ALLOWED_VIDEO_TYPES = new Set(['opening', 'branding_animated_logo'])
const ALLOWED_IMAGE_TYPES = new Set(['sponsor', 'branding_logo'])
const OPENING_VIDEO_MIME_TYPES = new Set(['video/mp4'])
const ANIMATED_LOGO_MIME_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime'])
const ALLOWED_VIDEO_MIME_TYPES = new Set([...OPENING_VIDEO_MIME_TYPES, ...ANIMATED_LOGO_MIME_TYPES])
const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'])

const uploadTypeSchema = z.object({
  type: z.string().min(1),
})

function assertCloudinaryUpload(uploadResult) {
  const secureUrl = String(uploadResult?.secure_url || '').trim()
  const publicId = String(uploadResult?.public_id || '').trim()
  const resourceType = String(uploadResult?.resource_type || '').trim()

  if (!secureUrl || !publicId) {
    throw new HttpError(502, 'Cloudinary upload returned invalid metadata')
  }

  return {
    secure_url: secureUrl,
    public_id: publicId,
    resource_type: resourceType || undefined,
  }
}

const uploadVideo = multer({
  dest: TEMP_UPLOAD_DIR,
  limits: { fileSize: MAX_VIDEO_BYTES, files: 1 },
  fileFilter(req, file, cb) {
    const mime = String(file.mimetype || '').toLowerCase()
    if (!ALLOWED_VIDEO_MIME_TYPES.has(mime)) {
      return cb(new HttpError(400, 'Only MOV/MP4/WEBM video files are allowed'))
    }
    return cb(null, true)
  },
})

const uploadImage = multer({
  dest: TEMP_UPLOAD_DIR,
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
  fileFilter(req, file, cb) {
    const mime = String(file.mimetype || '').toLowerCase()
    if (!ALLOWED_IMAGE_MIME_TYPES.has(mime)) {
      return cb(new HttpError(400, 'Only image files are allowed'))
    }
    return cb(null, true)
  },
})

function randomSuffix() {
  return randomBytes(4).toString('hex')
}

function buildVideoPublicId(type, businessId) {
  return `${type}-b${businessId}-${Date.now()}-${randomSuffix()}`
}

function getVideoTypeConfig(type) {
  if (type === 'opening') {
    return {
      allowedMimes: OPENING_VIDEO_MIME_TYPES,
      folder: env.cloudinaryFolderVideo,
    }
  }

  return {
    allowedMimes: ANIMATED_LOGO_MIME_TYPES,
    folder: env.cloudinaryFolderBranding,
  }
}

async function safeUnlink(filePath) {
  if (!filePath) return
  await fs.unlink(filePath).catch(() => null)
}

async function upsertVideoAssetAndBusiness(type, req, uploadResult, fileSize, mimeType) {
  return withTransaction(async (client) => {
    await client.query(
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
      [req.user.business_id, type, uploadResult.secure_url, mimeType, fileSize, uploadResult.public_id, 'video'],
    )

    if (type === 'branding_animated_logo') {
      await client.query(
        `UPDATE businesses
         SET animated_logo_url = $1, updated_at = NOW()
         WHERE id = $2`,
        [uploadResult.secure_url, req.user.business_id],
      )
    }

    const result = await client.query(
      `SELECT id, type, path, mime_type, size_bytes, public_id, resource_type, created_at, updated_at
       FROM media_assets
       WHERE business_id = $1 AND type = $2
       LIMIT 1`,
      [req.user.business_id, type],
    )

    return result.rows[0] || null
  })
}

export const mediaRouter = Router()

mediaRouter.use(authenticate)

void fs.mkdir(TEMP_UPLOAD_DIR, { recursive: true }).catch(() => null)

mediaRouter.get(
  '/opening',
  authorize('SUPER_ADMIN', 'ADMIN', 'STAFF'),
  asyncHandler(async (req, res) => {
    const result = await query(
      `SELECT id, type, path, mime_type, size_bytes, public_id, resource_type, created_at, updated_at
       FROM media_assets
       WHERE business_id = $1 AND type = 'opening'
       LIMIT 1`,
      [req.user.business_id],
    )
    return res.json({ success: true, data: result.rows[0] || null })
  }),
)

mediaRouter.get(
  '/branding-animated-logo',
  authorize('SUPER_ADMIN', 'ADMIN', 'STAFF'),
  asyncHandler(async (req, res) => {
    const result = await query(
      `SELECT id, type, path, mime_type, size_bytes, public_id, resource_type, created_at, updated_at
       FROM media_assets
       WHERE business_id = $1 AND type = 'branding_animated_logo'
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

mediaRouter.delete(
  '/branding-animated-logo',
  authorize('SUPER_ADMIN', 'ADMIN'),
  asyncHandler(async (req, res) => {
    const deleted = await withTransaction(async (client) => {
      const asset = await client.query(
        `DELETE FROM media_assets
         WHERE business_id = $1 AND type = 'branding_animated_logo'
         RETURNING public_id, resource_type`,
        [req.user.business_id],
      )

      await client.query(
        `UPDATE businesses
         SET animated_logo_url = NULL, updated_at = NOW()
         WHERE id = $1`,
        [req.user.business_id],
      )

      return asset.rows[0] || null
    })

    if (deleted?.public_id) {
      await deleteFromCloudinary(deleted.public_id, deleted.resource_type || 'video').catch(() => null)
    }

    return res.json({ success: true, data: { deleted: Boolean(deleted?.public_id) } })
  }),
)

function videoUploadMiddleware(req, res, next) {
  uploadVideo.single('video')(req, res, (error) => {
    if (!error) return next()
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return next(new HttpError(400, 'Video exceeds 260MB'))
    }
    return next(error)
  })
}

async function handleVideoUpload(req, res) {
  const parsed = uploadTypeSchema.safeParse(req.body || {})
  if (!parsed.success) throw new HttpError(400, 'Invalid payload', parsed.error.issues)

  const type = String(parsed.data.type || '').trim().toLowerCase()
  if (!ALLOWED_VIDEO_TYPES.has(type)) throw new HttpError(400, 'Unsupported video type')

  const file = req.file
  if (!file?.path) throw new HttpError(400, 'Video file is required')

  const mimeType = String(file.mimetype || '').toLowerCase()
  const { allowedMimes, folder } = getVideoTypeConfig(type)

  if (!allowedMimes.has(mimeType)) {
    if (type === 'opening') {
      throw new HttpError(400, 'Opening Screen Intro Video must be MP4')
    }
    throw new HttpError(400, 'Animated Logo must be MOV, MP4, or WEBM')
  }

  const existing = await query(
    `SELECT id, public_id, resource_type, path
     FROM media_assets
     WHERE business_id = $1 AND type = $2
     LIMIT 1`,
    [req.user.business_id, type],
  )

  let uploadResult = null
  try {
    const uploaded = await uploadLargeFileToCloudinary({
      filePath: file.path,
      folder,
      resourceType: 'video',
      publicId: buildVideoPublicId(type, req.user.business_id),
      chunkSizeBytes: VIDEO_UPLOAD_CHUNK_BYTES,
    })
    uploadResult = assertCloudinaryUpload(uploaded)

    const persisted = await upsertVideoAssetAndBusiness(
      type,
      req,
      uploadResult,
      Number(file.size || 0),
      mimeType,
    ).catch(async (dbError) => {
      if (uploadResult?.public_id) {
        await deleteFromCloudinary(uploadResult.public_id, 'video').catch(() => null)
      }
      throw dbError
    })

    const oldPublicId = existing.rows[0]?.public_id
    if (oldPublicId && oldPublicId !== uploadResult.public_id) {
      await deleteFromCloudinary(oldPublicId, existing.rows[0]?.resource_type || 'video').catch(() => null)
    }

    return res.status(201).json({ success: true, data: persisted })
  } finally {
    await safeUnlink(file.path)
  }
}

mediaRouter.post('/upload-video', authorize('SUPER_ADMIN', 'ADMIN'), videoUploadMiddleware, asyncHandler(handleVideoUpload))

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
    if (!file?.path) throw new HttpError(400, 'Image file is required')
    const mimeType = String(file.mimetype || '').toLowerCase()
    if (!ALLOWED_IMAGE_MIME_TYPES.has(mimeType)) throw new HttpError(400, 'Only image files are allowed')

    try {
      const uploadResult = await uploadFileToCloudinary({
        filePath: file.path,
        folder: type === 'sponsor' ? env.cloudinaryFolderSponsor : env.cloudinaryFolderBranding,
        resourceType: 'image',
        publicId: `${type}-b${req.user.business_id}-${Date.now()}-${randomSuffix()}`,
      })
      const normalizedUpload = assertCloudinaryUpload(uploadResult)

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
          [req.user.business_id, normalizedUpload.secure_url, mimeType, Number(file.size || 0), normalizedUpload.public_id],
        )

        await query(
          `UPDATE businesses
           SET logo_url = $1, updated_at = NOW()
           WHERE id = $2`,
          [normalizedUpload.secure_url, req.user.business_id],
        )

        const oldPublicId = existing.rows[0]?.public_id
        if (oldPublicId && oldPublicId !== normalizedUpload.public_id) {
          await deleteFromCloudinary(oldPublicId, existing.rows[0]?.resource_type || 'image').catch(() => null)
        }
      }

      return res.status(201).json({
        success: true,
        data: {
          url: normalizedUpload.secure_url,
          public_id: normalizedUpload.public_id,
          resource_type: 'image',
          type,
        },
      })
    } finally {
      await safeUnlink(file.path)
    }
  }),
)
