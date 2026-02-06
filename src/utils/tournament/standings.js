/*
  حساب الترتيب للدوري من نتائج المباريات المنتهية فقط.
  - 3 نقاط للفوز، 1 للتعادل.
*/
export function buildInitialStandings(teams) {
  return teams.map((t) => ({
    teamId: t.id,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    gf: 0,
    ga: 0,
    gd: 0,
    points: 0,
  }))
}

export function computeStandings(teams, matches) {
  const nameById = new Map(teams.map((t) => [t.id, t.teamName || '']))
  const rows = new Map(buildInitialStandings(teams).map((r) => [r.teamId, r]))

  for (const m of matches) {
    if (m.mode !== 'league') continue
    if (m.status !== 'finished' && m.status !== 'live') continue
    if (!m.homeTeamId || !m.awayTeamId) continue

    const home = rows.get(m.homeTeamId)
    const away = rows.get(m.awayTeamId)
    if (!home || !away) continue

    const hs = Number(m.homeScore ?? 0)
    const as = Number(m.awayScore ?? 0)

    home.played += 1
    away.played += 1

    home.gf += hs
    home.ga += as
    away.gf += as
    away.ga += hs

    if (hs > as) {
      home.wins += 1
      away.losses += 1
      home.points += 3
    } else if (hs < as) {
      away.wins += 1
      home.losses += 1
      away.points += 3
    } else {
      home.draws += 1
      away.draws += 1
      home.points += 1
      away.points += 1
    }
  }

  const out = [...rows.values()].map((r) => ({ ...r, gd: r.gf - r.ga }))

  out.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    if (b.gd !== a.gd) return b.gd - a.gd
    if (b.gf !== a.gf) return b.gf - a.gf
    const an = nameById.get(a.teamId) || ''
    const bn = nameById.get(b.teamId) || ''
    if (an && bn) {
      const c = an.localeCompare(bn, 'ar')
      if (c !== 0) return c
    }
    return String(a.teamId).localeCompare(String(b.teamId))
  })

  return out.map((r, idx) => ({ ...r, rank: idx + 1 }))
}
