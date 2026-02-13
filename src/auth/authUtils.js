import { ACCOUNTS, ACTIVATION_DATE } from './accounts'

const AUTH_SESSION_KEY = 'authSession'

function activationDateMs() {
  const [year, month, day] = ACTIVATION_DATE.split('-').map(Number)
  return Date.UTC(year, month - 1, day, 0, 0, 0, 0)
}

export function computeExpirationDate(durationInDays) {
  const startMs = activationDateMs()
  const endMs = startMs + Number(durationInDays) * 24 * 60 * 60 * 1000
  return new Date(endMs).toISOString()
}

export function isExpired(expirationDate) {
  const expirationMs = new Date(expirationDate).getTime()
  if (!Number.isFinite(expirationMs)) return true
  return Date.now() > expirationMs
}

export function clearSession() {
  localStorage.removeItem(AUTH_SESSION_KEY)
}

export function getSession() {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function hasValidSession() {
  const session = getSession()
  if (!session?.isAuthenticated || !session?.expirationDate) return false
  if (isExpired(session.expirationDate)) {
    clearSession()
    return false
  }
  return true
}

export function createSessionForAccount(account) {
  return {
    username: account.username,
    expirationDate: computeExpirationDate(account.durationInDays),
    isAuthenticated: true,
  }
}

export function saveSession(session) {
  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session))
}

export function loginWithCredentials(username, password) {
  const normalizedUsername = String(username ?? '').trim()
  const normalizedPassword = String(password ?? '')

  const account = ACCOUNTS.find(
    (item) => item.username === normalizedUsername && item.password === normalizedPassword,
  )
  if (!account) return { ok: false, reason: 'invalid' }

  const expirationDate = computeExpirationDate(account.durationInDays)
  if (isExpired(expirationDate)) return { ok: false, reason: 'expired' }

  const session = createSessionForAccount(account)
  saveSession(session)
  return { ok: true, session }
}

export function logout() {
  clearSession()
}

export function getExpiredReasonFromSession() {
  const session = getSession()
  if (!session) return null
  if (!session?.expirationDate) return null
  return isExpired(session.expirationDate) ? 'expired' : null
}

