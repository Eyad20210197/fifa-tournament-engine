function nextPowerOfTwo(n) {
  let p = 1
  while (p < n) p *= 2
  return p
}

/*
  دوري (Round Robin) - خوارزمية الدائرة (Circle Method)
  - كل فريق يلعب مرة واحدة ضد كل فريق آخر (دور واحد).
  - إذا كان العدد فردياً نضيف "راحة" (bye) كـ null.
*/
export function generateRoundRobinMatches(teams) {
  const teamIds = teams.map((t) => t.id)
  if (teamIds.length < 2) return []

  const list = [...teamIds]
  if (list.length % 2 === 1) list.push(null)

  const n = list.length
  const rounds = n - 1
  const half = n / 2
  const matches = []

  for (let round = 0; round < rounds; round += 1) {
    const pairs = []
    for (let i = 0; i < half; i += 1) {
      const a = list[i]
      const b = list[n - 1 - i]
      if (!a || !b) continue

      // التبديل لتفادي أفضلية ثابتة للمضيف
      const evenRound = round % 2 === 0
      pairs.push(evenRound ? [a, b] : [b, a])
    }

    pairs.forEach(([homeTeamId, awayTeamId], idx) => {
      matches.push({
        id: crypto.randomUUID(),
        homeTeamId,
        awayTeamId,
        homeScore: 0,
        awayScore: 0,
        status: 'pending',
        mode: 'league',
        round: round + 1,
        order: round * 100 + idx,
      })
    })

    // rotate: keep first fixed, rotate the rest
    const fixed = list[0]
    const rest = list.slice(1)
    rest.unshift(rest.pop())
    list.splice(0, list.length, fixed, ...rest)
  }

  return matches
}

export function estimateRoundRobinRounds(teamCount) {
  const adjusted = teamCount % 2 === 1 ? teamCount + 1 : teamCount
  return Math.max(0, adjusted - 1)
}

export { nextPowerOfTwo }

