import { useCallback, useEffect, useMemo, useState } from 'react'
import { api, setSubscriptionExpiredHandler, setUnauthorizedHandler } from '../services/api'
import { defaultRouteForRole } from './roles'
import { AuthContext } from './authContext'

const TOKEN_KEY = 'saasToken'
const USER_KEY = 'saasUser'

function decodeJwtPayload(token) {
  try {
    const parts = String(token || '').split('.')
    if (parts.length < 2) return null
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4 || 4)) % 4)
    const decoded = atob(padded)
    return JSON.parse(decoded)
  } catch {
    return null
  }
}

function isTokenExpired(token) {
  const payload = decodeJwtPayload(token)
  if (!payload?.exp) return false
  return Date.now() >= payload.exp * 1000
}

function applyBranding(branding) {
  const root = document.documentElement
  if (branding?.primary_color) {
    root.style.setProperty('--primary-color', branding.primary_color)
  }
  if (branding?.secondary_color) {
    root.style.setProperty('--secondary-color', branding.secondary_color)
  }
}

async function fetchBranding() {
  const candidates = ['/business/branding', '/businesses/branding', '/branding']

  for (const endpoint of candidates) {
    try {
      const response = await api.get(endpoint)
      return response?.data?.data || response?.data || null
    } catch (error) {
      const status = Number(error?.response?.status || 0)
      // Branding is optional at login bootstrap. Do not fail authentication flow
      // when endpoint variants are missing or forbidden for current role.
      if (status === 401 || status === 403 || status === 404) continue
      throw error
    }
  }

  return null
}

function readInitialSession() {
  const storedToken = localStorage.getItem(TOKEN_KEY)
  const storedUserRaw = localStorage.getItem(USER_KEY)

  let storedUser = null
  try {
    storedUser = storedUserRaw ? JSON.parse(storedUserRaw) : null
  } catch {
    storedUser = null
  }

  if (!storedToken || isTokenExpired(storedToken)) {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    return {
      token: null,
      user: null,
      business: null,
      branding: null,
      subscriptionExpired: false,
      ready: true,
    }
  }

  const payload = decodeJwtPayload(storedToken)
  const mergedUser = storedUser || {
    id: payload?.sub ? Number(payload.sub) : undefined,
    username: payload?.username,
    role: payload?.role,
    business_id: payload?.business_id,
  }

  return {
    token: storedToken,
    user: mergedUser,
    business: { id: payload?.business_id || mergedUser?.business_id || null },
    branding: null,
    subscriptionExpired: false,
    ready: true,
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => readInitialSession())
  const role = session.user?.role || null

  const logout = useCallback(({ redirect = false } = {}) => {
    setSession({
      token: null,
      user: null,
      business: null,
      branding: null,
      subscriptionExpired: false,
      ready: true,
    })

    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)

    if (redirect) {
      window.location.href = '/saas/login'
    }
  }, [])

  useEffect(() => {
    if (!session.token) return

    void fetchBranding().then((data) => {
      if (!data) return
      setSession((current) => ({ ...current, branding: data }))
      applyBranding(data)
    })
  }, [session.token])

  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout({ redirect: true })
    })

    setSubscriptionExpiredHandler(() => {
      setSession((current) => ({ ...current, subscriptionExpired: true }))
    })

    return () => {
      setUnauthorizedHandler(null)
      setSubscriptionExpiredHandler(null)
    }
  }, [logout])

  async function login(credentials) {
    const response = await api.post('/auth/login', credentials)
    const nextToken = response?.data?.token
    const nextUser = response?.data?.user

    const nextSession = {
      token: nextToken,
      user: nextUser,
      business: { id: nextUser?.business_id || null },
      branding: null,
      subscriptionExpired: false,
      ready: true,
    }

    setSession(nextSession)

    localStorage.setItem(TOKEN_KEY, nextToken)
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser))

    const nextBranding = await fetchBranding().catch(() => null)
    if (nextBranding) {
      setSession((current) => ({ ...current, branding: nextBranding }))
      applyBranding(nextBranding)
    }

    return { token: nextToken, user: nextUser, redirectTo: defaultRouteForRole(nextUser?.role) }
  }

  const value = useMemo(
    () => ({
      ready: session.ready,
      token: session.token,
      user: session.user,
      role,
      business: session.business,
      branding: session.branding,
      subscriptionExpired: session.subscriptionExpired,
      isAuthenticated: Boolean(session.token && session.user),
      login,
      logout,
      setSubscriptionExpired: (value) =>
        setSession((current) => ({ ...current, subscriptionExpired: Boolean(value) })),
    }),
    [session, role, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
