import { apiClient } from './apiClient'

export async function fetchDeviceRuntimeSnapshot() {
  const response = await apiClient.get('/businesses/device-runtime')
  return response.data.data
}

export async function updateDeviceStatus(deviceNumber, isOnline) {
  const response = await apiClient.patch(`/businesses/device-runtime/devices/${deviceNumber}/status`, {
    is_online: Boolean(isOnline),
  })
  return response.data.data
}
