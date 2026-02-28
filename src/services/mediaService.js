import { apiClient } from './apiClient'

function withUploadProgress(onProgress) {
  if (typeof onProgress !== 'function') return undefined
  return (event) => {
    const total = Number(event?.total || 0)
    if (!total) return
    const percent = Math.max(0, Math.min(100, Math.round((Number(event.loaded || 0) / total) * 100)))
    onProgress(percent, event)
  }
}

export async function fetchOpeningVideo() {
  const response = await apiClient.get('/media/opening')
  return response.data?.data || null
}

export async function uploadOpeningVideo(file, { onProgress } = {}) {
  const body = new FormData()
  body.append('video', file)
  body.append('type', 'opening')
  const response = await apiClient.post('/media/upload-video', body, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: withUploadProgress(onProgress),
  })
  return response.data?.data || null
}

export async function deleteOpeningVideo() {
  const response = await apiClient.delete('/media/opening')
  return response.data?.data || null
}

export async function uploadSponsorLogo(file, { onProgress } = {}) {
  const body = new FormData()
  body.append('image', file)
  body.append('type', 'sponsor')
  const response = await apiClient.post('/media/upload-logo', body, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: withUploadProgress(onProgress),
  })
  return response.data?.data || null
}

export async function uploadBrandingLogo(file, { onProgress } = {}) {
  const body = new FormData()
  body.append('image', file)
  body.append('type', 'branding_logo')
  const response = await apiClient.post('/media/upload-logo', body, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: withUploadProgress(onProgress),
  })
  return response.data?.data || null
}

export async function uploadBrandingAnimatedLogo(file, { onProgress } = {}) {
  const body = new FormData()
  body.append('video', file)
  body.append('type', 'branding_animated_logo')
  const response = await apiClient.post('/media/upload-video', body, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: withUploadProgress(onProgress),
  })
  return response.data?.data || null
}

export async function fetchBrandingAnimatedLogo() {
  const response = await apiClient.get('/media/branding-animated-logo')
  return response.data?.data || null
}

export async function deleteBrandingAnimatedLogo() {
  const response = await apiClient.delete('/media/branding-animated-logo')
  return response.data?.data || null
}
