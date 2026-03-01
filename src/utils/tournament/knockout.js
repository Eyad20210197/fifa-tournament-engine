import { newId } from '../uuid'
import { nextPowerOfTwo } from './roundRobin'

function chunkPairs(arr) {
  const out = []
  for (let i = 0; i < arr.length; i += 2) out.push([arr[i] ?? null, arr[i + 1] ?? null])
  return out
}

function roundLabel(roundIndexFrom1, totalRounds) {
  // roundIndexFrom1: 1..totalRounds, حيث 1 = أول دور (قد يكون 16/8/4..)
  const remaining = totalRounds - roundIndexFrom1 + 1
  if (remaining === 1) return 'النهائي'
  if (remaining === 2) return 'نصف النهائي'
  if (remaining === 3) return 'ربع النهائي'
  return `دور ${2 ** (remaining - 1)}`
}

/*
  خروج مغلوب (Knockout)
  - يبني شجرة كاملة حتى أقرب قوة 2.
  - يسمح بـ null للفراغات (bye).
  - يضع nextMatchId + nextSlot لتمكين التقدّم لاحقاً في Phase 4/5.
*/
export function generateKnockoutMatches(teams) {
  const teamIds = teams.map((t) => t.id)
  if (teamIds.length < 2) return []

  const size = nextPowerOfTwo(teamIds.length)
  const totalRounds = Math.log2(size)

  const seeded = [...teamIds]
  while (seeded.length < size) seeded.push(null)

  // أول دور: (1 vs آخر) (2 vs قبل الأخير) ... لتوزيع أقرب للمنطقي
  const firstRoundPairs = []
  for (let i = 0; i < size / 2; i += 1) {
    const a = seeded[i]
    const b = seeded[size - 1 - i]
    firstRoundPairs.push([a ?? null, b ?? null])
  }

  const rounds = []
  rounds.push(firstRoundPairs)
  for (let r = 2; r <= totalRounds; r += 1) {
    // كل جولة نصف عدد المباريات
    const prev = rounds[rounds.length - 1]
    const slots = new Array(prev.length).fill(null) // placeholders
    rounds.push(chunkPairs(slots))
  }

  // أنشئ كل المباريات مع روابط التقدم
  const allMatches = []
  const byRound = []

  for (let r = 1; r <= totalRounds; r += 1) {
    const pairs = rounds[r - 1]
    const label = roundLabel(r, totalRounds)
    const roundMatches = pairs.map(([homeTeamId, awayTeamId], idx) => {
      const matchId = newId()
      return {
        id: matchId,
        homeTeamId,
        awayTeamId,
        homeScore: 0,
        awayScore: 0,
        status: homeTeamId && awayTeamId ? 'pending' : homeTeamId || awayTeamId ? 'finished' : 'pending',
        mode: 'knockout',
        round: r,
        roundLabel: label,
        order: r * 100 + idx,
        nextMatchId: null,
        nextSlot: null, // 'home' | 'away'
        winnerTeamId: homeTeamId && !awayTeamId ? homeTeamId : awayTeamId && !homeTeamId ? awayTeamId : null,
      }
    })
    byRound.push(roundMatches)
    allMatches.push(...roundMatches)
  }

  // اربط كل مباراة بالتي تليها
  for (let r = 1; r < totalRounds; r += 1) {
    const current = byRound[r - 1]
    const next = byRound[r]
    for (let i = 0; i < current.length; i += 1) {
      const nextIndex = Math.floor(i / 2)
      const nextSlot = i % 2 === 0 ? 'home' : 'away'
      current[i].nextMatchId = next[nextIndex].id
      current[i].nextSlot = nextSlot
    }
  }

  // تقدّم تلقائي للـ byes (حالات فريق واحد) حتى لا تبقى الأدوار التالية فارغة
  const map = new Map(allMatches.map((m) => [m.id, m]))
  let changed = true
  while (changed) {
    changed = false
    for (const m of allMatches) {
      if (!m.winnerTeamId) continue
      if (!m.nextMatchId || !m.nextSlot) continue
      const next = map.get(m.nextMatchId)
      if (!next) continue

      const field = m.nextSlot === 'home' ? 'homeTeamId' : 'awayTeamId'
      if (next[field] === m.winnerTeamId) continue
      next[field] = m.winnerTeamId
      changed = true

      // إذا أصبح لدينا فريق واحد فقط في مباراة قادمة، اعتبرها منتهية تلقائياً (bye) ومرر الفائز
      if (next.homeTeamId && !next.awayTeamId) {
        next.status = 'finished'
        next.winnerTeamId = next.homeTeamId
      } else if (next.awayTeamId && !next.homeTeamId) {
        next.status = 'finished'
        next.winnerTeamId = next.awayTeamId
      }
    }
  }

  return allMatches
}
