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
  return uploaded
}

export async function uploadLargeFileToCloudinary({
  filePath,
  folder,
  resourceType,
  publicId,
  chunkSizeBytes = 20 * 1024 * 1024,
}) {
  const uploaded = await cloudinary.uploader.upload_large(filePath, {
    folder,
    resource_type: resourceType,
    public_id: normalizePublicId(publicId),
    chunk_size: chunkSizeBytes,
    overwrite: false,
    invalidate: true,
  })
  return uploaded
}

export async function deleteFromCloudinary(publicId, resourceType) {
  if (!publicId) return
  await cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType || 'image',
    invalidate: true,
  })
}
