/**
 * Global FIFA Tournament Rule & Auto-Calibration Simulator Engine
 */

export const POWER_OF_TWO_KNOCKOUT_SIZES = [2, 4, 8, 16, 32, 64, 128]

export function isPowerOfTwo(n) {
  return typeof n === 'number' && n > 1 && (n & (n - 1)) === 0
}

export function getNearestPowersOfTwo(n) {
  if (n <= 2) return { lower: 2, upper: 4 }
  let lower = 2
  while (lower * 2 <= n) lower *= 2
  return { lower, upper: lower * 2 }
}

/**
 * Calculate total matches for tournament configuration
 */
export function calculateTotalMatches({
  format = 'دوري',
  teamCount = 8,
  homeAwayEnabled = false,
}) {
  const n = Math.max(2, Number(teamCount) || 2)
  const isKnockout = format === 'خروج مغلوب' || format === 'knockout'
  const isLeague = format === 'دوري' || format === 'league'

  if (isKnockout) {
    const baseMatches = n - 1
    return homeAwayEnabled ? baseMatches * 2 : baseMatches
  }

  if (isLeague) {
    const baseMatches = (n * (n - 1)) / 2
    return homeAwayEnabled ? baseMatches * 2 : baseMatches
  }

  // Groups + Knockout default calculation (e.g. Groups of 4, top 2 advance)
  const groups = Math.max(2, Math.floor(n / 4))
  const teamsPerGroup = Math.floor(n / groups)
  const groupMatches = groups * ((teamsPerGroup * (teamsPerGroup - 1)) / 2)
  const advancingTeams = groups * 2
  const knockoutMatches = advancingTeams - 1
  const baseMatches = groupMatches + knockoutMatches
  return homeAwayEnabled ? baseMatches * 2 : baseMatches
}

/**
 * Validate tournament rules and calculate time feasibility
 */
export function calibrateTournament({
  format = 'دوري',
  teamCount = 8,
  homeAwayEnabled = false,
  availableConsoles = 1,
  matchDurationMinutes = 10,
  turnoverBufferMinutes = 2,
  tournamentDurationHours = 8,
}) {
  const teams = Math.max(2, Number(teamCount) || 2)
  const consoles = Math.max(1, Number(availableConsoles) || 1)
  const matchDuration = Math.max(4, Number(matchDurationMinutes) || 10)
  const buffer = Math.max(0, Number(turnoverBufferMinutes) || 0)
  const availableHours = Math.max(0.5, Number(tournamentDurationHours) || 8)

  const isKnockout = format === 'خروج مغلوب' || format === 'knockout'

  // Rule Check: Knockout Power of 2
  const ruleViolation =
    isKnockout && !isPowerOfTwo(teams)
      ? {
          type: 'KNOCKOUT_POWER_OF_2',
          messageAr: `قاعدة الإقصائيات: بطولة خروج المغلوب النقية تتطلب عدد فرق من مضاعفات القوة 2 (2، 4، 8، 16، 32، 64، 128). لا يمكن عمل شجرة متوازنة لـ ${teams} فرق بدون تصفيات تمهيدية.`,
          messageEn: `Knockout Rule: Pure single-elimination brackets strictly require power-of-2 team counts (2, 4, 8, 16, 32, 64, 128). ${teams} teams cannot form a balanced knockout tree without play-ins.`,
          nearest: getNearestPowersOfTwo(teams),
        }
      : null

  // Time & Capacity Calculation
  const totalMatches = calculateTotalMatches({
    format,
    teamCount: teams,
    homeAwayEnabled,
  })

  const singleMatchSlotMinutes = matchDuration + buffer
  const totalPlayMinutes = totalMatches * singleMatchSlotMinutes
  const wallClockMinutesNeeded = totalPlayMinutes / consoles
  const neededHours = Number((wallClockMinutesNeeded / 60).toFixed(1))
  const availableMinutes = availableHours * 60

  const isTimeFeasible = wallClockMinutesNeeded <= availableMinutes
  const overrunHours = Number(Math.max(0, (wallClockMinutesNeeded - availableMinutes) / 60).toFixed(1))
  const utilizationPercent = Math.min(100, Math.round((wallClockMinutesNeeded / availableMinutes) * 100))
  const matchesPerConsole = Number((totalMatches / consoles).toFixed(1))

  // Smart Suggestions Generator
  const suggestions = []

  if (!isTimeFeasible) {
    // 1. Suggest Single Leg if Home & Away is ON
    if (homeAwayEnabled) {
      const singleLegMatches = calculateTotalMatches({ format, teamCount: teams, homeAwayEnabled: false })
      const singleLegHours = Number(((singleLegMatches * singleMatchSlotMinutes) / consoles / 60).toFixed(1))
      suggestions.push({
        id: 'SWITCH_SINGLE_LEG',
        actionLabelAr: 'تحويل إلى مباراة واحدة (إلغاء الذهاب والإياب)',
        actionLabelEn: 'Switch to Single Match (Disable 2-Legs)',
        effectAr: `يوفر نصف الوقت ويخفض مدة البطولة إلى ${singleLegHours} ساعة.`,
        effectEn: `Cuts time in half, reducing tournament length to ${singleLegHours} hours.`,
        patch: { home_away_enabled: false },
      })
    }

    // 2. Suggest Consoles needed
    const minConsolesNeeded = Math.ceil(totalPlayMinutes / availableMinutes)
    if (minConsolesNeeded > consoles) {
      suggestions.push({
        id: 'INCREASE_CONSOLES',
        actionLabelAr: `زيادة الأجهزة إلى ${minConsolesNeeded} أجهزة بلايستيشن`,
        actionLabelEn: `Increase Stations to ${minConsolesNeeded} PlayStation Consoles`,
        effectAr: `توزيع المباريات بالتوازي للانتهاء خلال ${availableHours} ساعة.`,
        effectEn: `Distributes matches concurrently to finish within ${availableHours} hours.`,
        patch: { available_consoles: minConsolesNeeded },
      })
    }

    // 3. Suggest Match Duration adjustment
    const maxMatchMinutes = Math.floor((availableMinutes * consoles) / totalMatches) - buffer
    if (maxMatchMinutes >= 4) {
      suggestions.push({
        id: 'REDUCE_MATCH_TIME',
        actionLabelAr: `تقليل مدة المباراة إلى ${maxMatchMinutes} دقيقة`,
        actionLabelEn: `Reduce Match Duration to ${maxMatchMinutes} minutes`,
        effectAr: `تعديل وقت الشوطين لإنهاء البطولة في نفس الموعد.`,
        effectEn: `Adjusts half length to fit all matches within the time limit.`,
        patch: { match_duration_minutes: maxMatchMinutes },
      })
    }

    // 4. Suggest Duration Extension
    const recommendedHours = Math.ceil(neededHours)
    suggestions.push({
      id: 'EXTEND_DURATION',
      actionLabelAr: `تمديد وقت الصالة إلى ${recommendedHours} ساعات`,
      actionLabelEn: `Extend Venue Window to ${recommendedHours} hours`,
      effectAr: `إتاحة وقت كافٍ لجميع المباريات بدون ضغط.`,
      effectEn: `Allows ample time for all fixtures without rushing.`,
      patch: { tournament_duration_hours: recommendedHours },
    })
  }

  const isFullyCompatible = isTimeFeasible && !ruleViolation

  return {
    isCompatible: isFullyCompatible,
    statusColor: isFullyCompatible ? 'emerald' : 'rose',
    ruleViolation,
    totalMatches,
    singleMatchSlotMinutes,
    totalPlayMinutes,
    neededHours,
    availableHours,
    overrunHours,
    utilizationPercent,
    matchesPerConsole,
    consoles,
    suggestions,
  }
}

/**
 * Solve optimal configuration automatically to make it compatible
 */
export function autoCalibrateSettings(currentSettings) {
  const calibration = calibrateTournament(currentSettings)
  if (calibration.isCompatible) return currentSettings

  const optimized = { ...currentSettings }

  // If knockout rule violation, switch to League or nearest power of 2
  if (calibration.ruleViolation?.type === 'KNOCKOUT_POWER_OF_2') {
    optimized.format = 'دوري'
  }

  // If time overrun, pick best strategy:
  if (optimized.home_away_enabled) {
    optimized.home_away_enabled = false
  } else {
    // If still overrun, increase consoles or tune duration
    const testCalib = calibrateTournament(optimized)
    if (!testCalib.isCompatible) {
      const minConsoles = Math.ceil(testCalib.totalPlayMinutes / (optimized.tournament_duration_hours * 60))
      if (minConsoles <= 8) {
        optimized.available_consoles = minConsoles
      } else {
        optimized.tournament_duration_hours = Math.ceil(testCalib.neededHours)
      }
    }
  }

  return optimized
}
