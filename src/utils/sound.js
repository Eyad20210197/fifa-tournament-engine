import { Howl } from 'howler'
import { GOAL_SOUND_DATA_URI } from '../assets/goalSoundDataUri'

let goalHowl = null

function getGoalHowl() {
  if (goalHowl) return goalHowl
  goalHowl = new Howl({
    src: [GOAL_SOUND_DATA_URI],
    volume: 0.75,
    preload: true,
  })
  return goalHowl
}

export function playGoalSound() {
  try {
    getGoalHowl().play()
  } catch {
    // تجاهل أخطاء الصوت (قد يمنع المتصفح التشغيل قبل تفاعل المستخدم)
  }
}

