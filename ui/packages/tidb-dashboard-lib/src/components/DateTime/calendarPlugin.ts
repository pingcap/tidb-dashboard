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
    // calendar(referenceTime?: ConfigType, formats?: object): string
    calendar(referenceTime?: any, formats?: object): string
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
  proto.calendar = function (referenceTime, formats) {
    const format = formats || this.$locale().calendar || calendarFormat
    const referenceStartOfDay = d(referenceTime || undefined).startOf('d')
    const diff = this.diff(referenceStartOfDay, 'd', true)
    const weekDiff = this.week() - referenceStartOfDay.week()
    const sameElse = 'sameElse'
    /* eslint-disable no-nested-ternary */
    const retVal =
      weekDiff < -1 || weekDiff > 1
        ? sameElse
        : diff < -1
        ? weekDiff === 0
          ? 'sameWeek'
          : 'lastWeek'
        : diff < 0
        ? 'lastDay'
        : diff < 1
        ? 'sameDay'
        : diff < 2
        ? 'nextDay'
        : weekDiff === 0
        ? 'sameWeek'
        : 'nextWeek'
    /* eslint-enable no-nested-ternary */
    const currentFormat = format[retVal] || calendarFormat[retVal]
    if (typeof currentFormat === 'function') {
      return currentFormat.call(this, d())
    }
    return this.format(currentFormat)
  }
}
