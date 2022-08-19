import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)

// value range: -16 ~ 16
// 8 means UTC+08:00
let _tz: number | undefined = undefined

function getLocalTimeZone(): number {
  // in UTC+08:00 time zone, `dayjs().utcOffset()` will get 480
  // while `new Date().getTimezoneOffset()` will get -480
  return dayjs().utcOffset() / 60
}

function getTimeZone() {
  if (_tz === undefined) {
    _tz = getLocalTimeZone()
  }
  return _tz
}

function setTimeZone(timezone: number) {
  if (timezone >= -16 && timezone <= 16) {
    _tz = timezone
    return
  }
  throw new Error('timezone value must be range in -16~16.')
}

export default { getTimeZone, setTimeZone }
