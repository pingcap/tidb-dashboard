import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)

// value range: -12~14
// 8 means UTC+08:00
let _tz: number | null = null

function getLocalTimeZone(): number {
  // in UTC+08:00 time zone, `dayjs().utcOffset()` will get 480
  // while `new Date().getTimezoneOffset()` will get -480
  return dayjs().utcOffset() / 60
}

function getTimeZone() {
  if (_tz === null) {
    _tz = getLocalTimeZone()
  }
  return _tz
}

function getTimeZoneStr() {
  const z = getTimeZone()
  if (getTimeZone() >= 0) {
    return `utc+${z}`
  }
  return `utc${z}`
}

function setTimeZone(timezone: number) {
  // https://en.wikipedia.org/wiki/List_of_UTC_offsets
  if (timezone >= -12 && timezone <= 14) {
    _tz = timezone
    return
  }
  throw new Error('timezone value must be range in -12~14.')
}

export default { getTimeZone, getTimeZoneStr, setTimeZone }
