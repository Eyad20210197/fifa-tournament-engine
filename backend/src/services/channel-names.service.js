function normalizeId(id) {
  const value = String(id ?? '').trim()
  return value || null
}

export function tournamentChannel(tournamentId) {
  const id = normalizeId(tournamentId)
  return id ? `tournament:${id}` : null
}

export function matchChannel(matchId) {
  const id = normalizeId(matchId)
  return id ? `match:${id}` : null
}

export function adminChannel(tournamentId) {
  const id = normalizeId(tournamentId)
  return id ? `admin:${id}` : null
}

export function displayChannel(tournamentId) {
  const id = normalizeId(tournamentId)
  return id ? `display:${id}` : null
}
