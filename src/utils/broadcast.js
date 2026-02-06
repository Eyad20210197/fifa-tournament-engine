// قناة BroadcastChannel واحدة مشتركة على مستوى التطبيق.
// تعمل بين التبويبات/النوافذ لنفس الـ origin فقط.
export const tournamentChannel =
  typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('tournament-channel') : null

