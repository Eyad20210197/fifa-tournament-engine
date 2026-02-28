import { v2 as cloudinary } from 'cloudinary'
import { env } from '../config/env.js'

cloudinary.config({
  cloud_name: env.cloudinaryCloudName,
  api_key: env.cloudinaryApiKey,
  api_secret: env.cloudinaryApiSecret,
  secure: true,
})

function bufferToDataUri(buffer, mimeType) {
  const base64 = Buffer.from(buffer).toString('base64')
  return `data:${mimeType};base64,${base64}`
}

function normalizePublicId(publicId) {
  const value = String(publicId || '').trim()
  return value || undefined
}

function normalizeUploadResponse(uploaded) {
  const secureUrl = String(uploaded?.secure_url || uploaded?.url || '').trim()
  const publicId = String(uploaded?.public_id || '').trim()
  const resourceType = String(uploaded?.resource_type || '').trim()

  if (!secureUrl || !publicId) {
    throw new Error('Cloudinary upload did not return secure_url/public_id')
  }

  return {
    ...uploaded,
    secure_url: secureUrl,
    public_id: publicId,
    resource_type: resourceType || undefined,
  }
}

export async function uploadBufferToCloudinary({
  buffer,
  mimeType,
  folder,
  resourceType,
  publicId,
}) {
  const file = bufferToDataUri(buffer, mimeType)
  const uploaded = await cloudinary.uploader.upload(file, {
    folder,
    resource_type: resourceType,
    public_id: normalizePublicId(publicId),
    overwrite: false,
    invalidate: true,
  })
  return normalizeUploadResponse(uploaded)
}

export async function uploadFileToCloudinary({
  filePath,
  folder,
  resourceType,
  publicId,
}) {
  const uploaded = await cloudinary.uploader.upload(filePath, {
    folder,
    resource_type: resourceType,
    public_id: normalizePublicId(publicId),
    overwrite: false,
    invalidate: true,
  })
  return normalizeUploadResponse(uploaded)
}

export async function uploadLargeFileToCloudinary({
  filePath,
  folder,
  resourceType,
  publicId,
  chunkSizeBytes = 6000000,
}) {
  return new Promise((resolve, reject) => {
    let settled = false

    const onComplete = (error, result) => {
      if (settled) return
      if (error) {
        settled = true
        reject(error)
        return
      }

      try {
        const normalized = normalizeUploadResponse(result)
        settled = true
        resolve(normalized)
      } catch (normalizationError) {
        settled = true
        reject(normalizationError)
      }
    }

    try {
      const stream = cloudinary.uploader.upload_large(
        filePath,
        {
          folder,
          resource_type: resourceType,
          public_id: normalizePublicId(publicId),
          chunk_size: chunkSizeBytes,
          overwrite: false,
          invalidate: true,
        },
        onComplete,
      )

      if (stream && typeof stream.on === 'function') {
        stream.on('error', (streamError) => {
          if (settled) return
          settled = true
          reject(streamError)
        })
      }
    } catch (error) {
      reject(error)
    }
  })
}

export async function deleteFromCloudinary(publicId, resourceType) {
  if (!publicId) return
  await cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType || 'image',
    invalidate: true,
  })
}
