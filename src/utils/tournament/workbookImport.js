function normalizeHeader(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
}

function normalizeString(value) {
  return String(value ?? '').trim()
}

function normalizeRow(row) {
  return Object.fromEntries(Object.entries(row || {}).map(([key, value]) => [normalizeHeader(key), value]))
}

function normalizeClubName(value) {
  const text = normalizeString(value)
  return text || null
}

function slugifyTeamRef(value, fallbackIndex) {
  const base = normalizeHeader(value).replace(/_+/g, '-').replace(/^-+|-+$/g, '')
  if (base) return base
  return `team-${fallbackIndex}`
}

function parsePositiveInteger(value, fieldLabel, rowNumber) {
  if (value === undefined || value === null || value === '') return null
  const parsed = Number(String(value).trim())
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${fieldLabel} must be a positive integer on row ${rowNumber}`)
  }
  return parsed
}

function formatDatePart(value) {
  if (!value) return ''

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = String(value.getFullYear()).padStart(4, '0')
    const month = String(value.getMonth() + 1).padStart(2, '0')
    const day = String(value.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const text = normalizeString(value)
  if (!text) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text

  const parsed = new Date(text)
  if (Number.isNaN(parsed.getTime())) return ''

  const year = String(parsed.getFullYear()).padStart(4, '0')
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const day = String(parsed.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatTimePart(value) {
  if (!value) return ''

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const hours = String(value.getHours()).padStart(2, '0')
    const minutes = String(value.getMinutes()).padStart(2, '0')
    return `${hours}:${minutes}`
  }

  const text = normalizeString(value)
  if (!text) return ''
  const matched = text.match(/^(\d{1,2}):(\d{2})/)
  if (!matched) return ''
  const hours = String(Number(matched[1])).padStart(2, '0')
  const minutes = matched[2]
  return `${hours}:${minutes}`
}

function normalizeStartsAt(value) {
  if (value === undefined || value === null || value === '') return null

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().replace(/\.\d{3}Z$/, 'Z')
  }

  const text = normalizeString(value)
  if (!text) return null

  const parsed = new Date(text)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid starts_at value: ${text}`)
  }
  return parsed.toISOString().replace(/\.\d{3}Z$/, 'Z')
}

function combineDateTime(dateValue, timeValue) {
  const datePart = formatDatePart(dateValue)
  if (!datePart) return null
  const timePart = formatTimePart(timeValue) || '00:00'
  const parsed = new Date(`${datePart}T${timePart}`)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date/time combination: ${datePart} ${timePart}`)
  }
  return parsed.toISOString().replace(/\.\d{3}Z$/, 'Z')
}

async function loadWorkbook(file) {
  const XLSX = await import('xlsx')
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, {
    type: 'array',
    cellDates: true,
  })
  return { XLSX, workbook }
}

function getSheetRows(XLSX, workbook, sheetName) {
  if (!sheetName) return []
  const sheet = workbook.Sheets[sheetName]
  if (!sheet) return []
  return XLSX.utils.sheet_to_json(sheet, { defval: '' })
}

function findSheetName(workbook, candidates, fallbackIndex = null) {
  const normalizedCandidates = new Set(candidates.map((value) => normalizeHeader(value)))
  const direct = workbook.SheetNames.find((sheetName) => normalizedCandidates.has(normalizeHeader(sheetName)))
  if (direct) return direct
  if (fallbackIndex == null) return null
  return workbook.SheetNames[fallbackIndex] || null
}

function buildTeamReferenceMaps(teams) {
  const byRef = new Map()
  const byName = new Map()

  for (const team of teams) {
    byRef.set(team.ref, team)
    byName.set(normalizeHeader(team.team_name), team)
  }

  return { byRef, byName }
}

function parseTeamsSheet(rows) {
  const teams = []
  const refs = new Set()
  const names = new Set()

  rows.forEach((row, index) => {
    const normalized = normalizeRow(row)
    const rowNumber = index + 2
    const teamName = normalizeString(
      normalized.team_name || normalized.team || normalized.teamname || normalized.name || normalized['اسم_الفريق'],
    )
    const clubName = normalizeClubName(normalized.club_name || normalized.club || normalized.clubname || normalized['اسم_النادي'])
    const explicitRef = normalizeString(normalized.team_ref || normalized.ref || normalized.team_code || normalized.code)

    if (!teamName) return

    const ref = explicitRef || slugifyTeamRef(teamName, rowNumber)
    const nameKey = normalizeHeader(teamName)
    if (refs.has(ref)) {
      throw new Error(`Duplicate team ref "${ref}" on Teams row ${rowNumber}`)
    }
    if (names.has(nameKey)) {
      throw new Error(`Duplicate team name "${teamName}" on Teams row ${rowNumber}`)
    }

    refs.add(ref)
    names.add(nameKey)
    teams.push({ ref, team_name: teamName, club_name: clubName })
  })

  return teams
}

function ensureMatchTeamReference(rawValue, maps, inferredTeams, rowNumber, label) {
  const text = normalizeString(rawValue)
  if (!text) {
    throw new Error(`Missing ${label} on Matches row ${rowNumber}`)
  }

  if (maps.byRef.has(text)) return text

  const byName = maps.byName.get(normalizeHeader(text))
  if (byName) return byName.ref

  const inferredNameKey = normalizeHeader(text)
  const inferredExisting = inferredTeams.find((team) => normalizeHeader(team.team_name) === inferredNameKey)
  if (inferredExisting) return inferredExisting.ref

  const ref = slugifyTeamRef(text, inferredTeams.length + 1)
  if (maps.byRef.has(ref) || inferredTeams.some((team) => team.ref === ref)) {
    throw new Error(`Ambiguous ${label} "${text}" on Matches row ${rowNumber}. Add a Teams sheet with team_ref values.`)
  }

  const created = {
    ref,
    team_name: text,
    club_name: null,
  }
  inferredTeams.push(created)
  return created.ref
}

function parseMatchesSheet(rows, baseTeams) {
  const maps = buildTeamReferenceMaps(baseTeams)
  const inferredTeams = []
  const matches = []

  rows.forEach((row, index) => {
    const normalized = normalizeRow(row)
    const rowNumber = index + 2

    const homeSource =
      normalized.home_team_ref ||
      normalized.home_ref ||
      normalized.home_team_code ||
      normalized.home_team ||
      normalized.home ||
      normalized.host
    const awaySource =
      normalized.away_team_ref ||
      normalized.away_ref ||
      normalized.away_team_code ||
      normalized.away_team ||
      normalized.away ||
      normalized.guest

    if (!normalizeString(homeSource) && !normalizeString(awaySource)) return

    const home_team_ref = ensureMatchTeamReference(homeSource, maps, inferredTeams, rowNumber, 'home team')
    const away_team_ref = ensureMatchTeamReference(awaySource, maps, inferredTeams, rowNumber, 'away team')

    if (home_team_ref === away_team_ref) {
      throw new Error(`Home and away team must be different on Matches row ${rowNumber}`)
    }

    let starts_at = null
    const startsAtSource =
      normalized.starts_at ||
      normalized.start_at ||
      normalized.kickoff ||
      normalized.kickoff_at ||
      normalized.match_time

    try {
      if (startsAtSource) {
        starts_at = normalizeStartsAt(startsAtSource)
      } else if (normalized.date || normalized.match_date) {
        starts_at = combineDateTime(normalized.date || normalized.match_date, normalized.time || normalized.start_time)
      }
    } catch (error) {
      throw new Error(`${error.message} on Matches row ${rowNumber}`)
    }

    matches.push({
      home_team_ref,
      away_team_ref,
      round_number: parsePositiveInteger(normalized.round_number || normalized.round, 'round_number', rowNumber) || 1,
      stage_name: normalizeString(normalized.stage_name || normalized.stage || normalized.round_name) || null,
      stage_number: parsePositiveInteger(normalized.stage_number || normalized.stage_no, 'stage_number', rowNumber) || 1,
      leg_number: parsePositiveInteger(normalized.leg_number || normalized.leg, 'leg_number', rowNumber) || 1,
      starts_at,
      tie_key: normalizeString(normalized.tie_key || normalized.tie || normalized.tie_code || normalized.tie_id) || null,
    })
  })

  const allTeams = baseTeams.length ? baseTeams : inferredTeams
  if (!allTeams.length) throw new Error('No teams found in workbook')
  if (!matches.length) throw new Error('No matches found in workbook')

  return { teams: allTeams, matches }
}

export async function readCustomTournamentWorkbook(file) {
  const { XLSX, workbook } = await loadWorkbook(file)
  const teamsSheetName = findSheetName(workbook, ['teams', 'team', 'فرق'])
  const matchesSheetName = findSheetName(workbook, ['matches', 'match', 'fixtures', 'schedule', 'جدول'], 0)

  const teams = parseTeamsSheet(getSheetRows(XLSX, workbook, teamsSheetName))
  return parseMatchesSheet(getSheetRows(XLSX, workbook, matchesSheetName), teams)
}

export async function downloadCustomTournamentTemplate(fileName = 'custom_tournament_template.xlsx') {
  const XLSX = await import('xlsx')
  const workbook = XLSX.utils.book_new()

  const guideSheet = XLSX.utils.aoa_to_sheet([
    ['Sheet', 'Required', 'Notes'],
    ['Teams', 'Optional', 'Recommended. Columns: team_ref, team_name, club_name'],
    ['Matches', 'Yes', 'Columns: home_team_ref, away_team_ref, round_number, stage_name, stage_number, leg_number, starts_at, tie_key'],
    ['starts_at', 'Optional', 'Use ISO date/time like 2026-03-09T18:00:00Z or separate date/time columns'],
    ['Import behavior', 'Yes', 'Import replaces all teams, matches, and standings in the selected tournament'],
  ])

  const teamsSheet = XLSX.utils.json_to_sheet([
    { team_ref: 'team-a', team_name: 'Team A', club_name: 'Club A' },
    { team_ref: 'team-b', team_name: 'Team B', club_name: 'Club B' },
    { team_ref: 'team-c', team_name: 'Team C', club_name: 'Club C' },
    { team_ref: 'team-d', team_name: 'Team D', club_name: 'Club D' },
  ])

  const matchesSheet = XLSX.utils.json_to_sheet([
    {
      home_team_ref: 'team-a',
      away_team_ref: 'team-b',
      round_number: 1,
      stage_name: 'Round 1',
      stage_number: 1,
      leg_number: 1,
      starts_at: '2026-03-09T18:00:00Z',
      tie_key: '',
    },
    {
      home_team_ref: 'team-c',
      away_team_ref: 'team-d',
      round_number: 1,
      stage_name: 'Round 1',
      stage_number: 1,
      leg_number: 1,
      starts_at: '2026-03-09T19:00:00Z',
      tie_key: '',
    },
  ])

  XLSX.utils.book_append_sheet(workbook, guideSheet, 'Guide')
  XLSX.utils.book_append_sheet(workbook, teamsSheet, 'Teams')
  XLSX.utils.book_append_sheet(workbook, matchesSheet, 'Matches')
  XLSX.writeFile(workbook, fileName)
}
