// Copyright 2024 PingCAP, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// Inspired by:
// https://github.com/iamkun/dayjs/issues/1226#issuecomment-768796249
// https://github.com/iamkun/dayjs/blob/dev/src/plugin/calendar/index.js

declare module 'dayjs' {
  interface Dayjs {
    calendar(refTime?: any, formats?: object): string
  }
}

export default (o, c, d) => {
  const LT = 'h:mm A'
  const L = 'MM/DD/YYYY'
  const calendarFormat = {
    lastDay: `[Yesterday at] ${LT}`,
    sameDay: `[Today at] ${LT}`,
    nextDay: `[Tomorrow at] ${LT}`,
    sameWeek: `dddd [at] ${LT}`,
    nextWeek: `[Next] dddd [at] ${LT}`,
    lastWeek: `[Last] dddd [at] ${LT}`,
    sameElse: L
  }
  const proto = c.prototype
  proto.calendar = function (refTime, formats) {
    const format = formats || this.$locale().calendar || calendarFormat
    const refDayStart = d(refTime || undefined).startOf('d')

    let retVal = ''
    const dayDiff = this.diff(refDayStart, 'd', true)

    if (dayDiff < -14 || dayDiff > 14) {
      retVal = 'sameElse'
    } else if (dayDiff < 0 && dayDiff >= -1) {
      retVal = 'lastDay'
    } else if (dayDiff >= 0 && dayDiff < 1) {
      retVal = 'sameDay'
    } else if (dayDiff >= 1 && dayDiff < 2) {
      retVal = 'nextDay'
    } else if (dayDiff < -1) {
      // -14 ~ -1
      if (this.startOf('week').unix() === refDayStart.startOf('week').unix()) {
        retVal = 'sameWeek'
      } else {
        const pass1Week = this.add(1, 'week')
        if (
          pass1Week.startOf('week').unix() ===
          refDayStart.startOf('week').unix()
        ) {
          retVal = 'lastWeek'
        }
      }
    } else if (dayDiff >= 2) {
      // 2 ~ 14
      if (this.startOf('week').unix() === refDayStart.startOf('week').unix()) {
        retVal = 'sameWeek'
      } else {
        const back1Week = this.subtract(1, 'week')
        if (
          back1Week.startOf('week').unix() ===
          refDayStart.startOf('week').unix()
        ) {
          retVal = 'nextWeek'
        }
      }
    }
    if (retVal === '') {
      retVal = 'sameElse'
    }

    /* eslint-enable no-nested-ternary */
    const currentFormat = format[retVal] || calendarFormat[retVal]
    if (typeof currentFormat === 'function') {
      return currentFormat.call(this, d())
    }
    return this.format(currentFormat)
  }
}
