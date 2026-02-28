import { apiClient } from './apiClient'

export async function fetchOpeningVideo() {
  const response = await apiClient.get('/media/opening')
  return response.data?.data || null
}

export async function uploadOpeningVideo(file) {
  const body = new FormData()
  body.append('video', file)
  body.append('type', 'opening')
  const response = await apiClient.post('/upload-video', body, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data?.data || null
}

export async function deleteOpeningVideo() {
  const response = await apiClient.delete('/media/opening')
  return response.data?.data || null
}
