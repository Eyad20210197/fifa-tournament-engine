/* global process */
/**
 * Edge Basic Auth for protected frontend routes.
 *
 * Set these in Vercel Project Settings -> Environment Variables:
 * - AUTH_USERNAME
 * - AUTH_PASSWORD
 */

const UNAUTHORIZED_HEADERS = {
  'WWW-Authenticate': 'Basic realm="Secure Area"',
  'Content-Type': 'text/plain; charset=utf-8',
  'Cache-Control': 'no-store',
}

function unauthorized() {
  return new Response('Unauthorized', {
    status: 401,
    headers: UNAUTHORIZED_HEADERS,
  })
}

function safeEqual(a, b) {
  const aStr = String(a ?? '')
  const bStr = String(b ?? '')
  const maxLen = Math.max(aStr.length, bStr.length)
  let diff = aStr.length ^ bStr.length

  for (let index = 0; index < maxLen; index += 1) {
    const aCode = index < aStr.length ? aStr.charCodeAt(index) : 0
    const bCode = index < bStr.length ? bStr.charCodeAt(index) : 0
    diff |= aCode ^ bCode
  }

  return diff === 0
}

function parseBasicAuth(authHeader) {
  if (!authHeader || !authHeader.startsWith('Basic ')) return null

  const encoded = authHeader.slice(6).trim()
  if (!encoded) return null

  try {
    const decoded = atob(encoded)
    const separatorIndex = decoded.indexOf(':')
    if (separatorIndex === -1) return null

    return {
      username: decoded.slice(0, separatorIndex),
      password: decoded.slice(separatorIndex + 1),
    }
  } catch {
    return null
  }
}

export const config = {
  matcher: ['/control', '/control/', '/display', '/display/'],
}

export default async function middleware(request) {
  const env = process?.env ?? {}
  const expectedUsername = env.AUTH_USERNAME ?? ''
  const expectedPassword = env.AUTH_PASSWORD ?? ''

  // Fail closed if credentials are not configured in Vercel env vars.
  if (!expectedUsername || !expectedPassword) {
    return unauthorized()
  }

  const auth = parseBasicAuth(request.headers.get('authorization'))
  if (!auth) {
    return unauthorized()
  }

  const usernameOk = safeEqual(auth.username, expectedUsername)
  const passwordOk = safeEqual(auth.password, expectedPassword)
  if (!usernameOk || !passwordOk) {
    return unauthorized()
  }

  // Continue to static file / rewrite pipeline.
  return fetch(request)
}

