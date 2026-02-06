import Dexie from 'dexie'

/*
  IndexedDB schema (Dexie)
  - الهدف: فصل الجداول حسب نموذج البيانات المطلوب لضمان الاسترجاع بدون فقدان بيانات.
*/

export const DEFAULT_SINGLETON_ID = 'main'

export const db = new Dexie('ramadan-fifa-2026')

db.version(1).stores({
  tournament: '&id',
  teams: 'id, teamName, clubName, player1, player2',
  matches: 'id, homeTeamId, awayTeamId, status',
  standings: 'teamId',
  activeScreen: '&id',
  sponsor: '&id',
  liveMatchState: '&id',
})

// v2: إضافة فهرس للترتيب حتى نحافظ على ترتيب الدوري بعد إعادة التحميل
db.version(2).stores({
  tournament: '&id',
  teams: 'id, teamName, clubName, player1, player2',
  matches: 'id, homeTeamId, awayTeamId, status',
  standings: 'teamId, rank',
  activeScreen: '&id',
  sponsor: '&id',
  liveMatchState: '&id',
})

export async function getSingleton(tableName, id = DEFAULT_SINGLETON_ID) {
  const table = db.table(tableName)
  return table.get(id)
}

export async function setSingleton(tableName, value, id = DEFAULT_SINGLETON_ID) {
  const table = db.table(tableName)
  return table.put({ id, ...value })
}
