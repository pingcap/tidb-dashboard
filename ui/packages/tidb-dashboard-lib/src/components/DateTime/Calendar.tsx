import React from 'react'
import { Tooltip } from 'antd'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import { addTranslationResource } from '@lib/utils/i18n'
import i18next from 'i18next'
import { format as longFormat } from './Long'
import { IDateTimeProps } from '.'

import calendar from './calendarPlugin'
import weekOfYear from 'dayjs/plugin/weekOfYear'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import tz from '@lib/utils/timezone'

dayjs.extend(calendar)
dayjs.extend(weekOfYear)
dayjs.extend(localizedFormat)

const translations = {
  en: {
    sameDay: '[Today at] h:mm A (UTCZ)',
    sameWeek: 'dddd h:mm A (UTCZ)',
    nextDay: '[Tomorrow] h:mm A (UTCZ)',
    nextWeek: '[Next] dddd h:mm A (UTCZ)',
    lastDay: '[Yesterday] h:mm A (UTCZ)',
    lastWeek: '[Last] dddd h:mm A (UTCZ)',
    sameElse: 'lll (UTCZ)'
  },
  zh: {
    sameDay: '[今天] HH:mm (UTCZ)',
    sameWeek: 'dddd HH:mm (UTCZ)',
    nextDay: '[明天] HH:mm (UTCZ)',
    nextWeek: '[下]dddd HH:mm (UTCZ)',
    lastDay: '[昨天] HH:mm (UTCZ)',
    lastWeek: '[上]dddd HH:mm (UTCZ)',
    sameElse: 'lll (UTCZ)'
  }
}

for (const key in translations) {
  addTranslationResource(key, {
    component: {
      dateTime: {
        calendar: translations[key]
      }
    }
  })
}

function Calendar({ unixTimestampMs, ...rest }: IDateTimeProps) {
  useTranslation() // Re-render when language changes
  return (
    <Tooltip title={longFormat(unixTimestampMs)} {...rest}>
      <span>{format(unixTimestampMs)}</span>
    </Tooltip>
  )
}

export function format(unixTimestampMs: number) {
  return dayjs(unixTimestampMs)
    .utcOffset(tz.getTimeZone())
    .calendar(undefined, {
      sameDay: i18next.t('component.dateTime.calendar.sameDay'),
      sameWeek: i18next.t('component.dateTime.calendar.sameWeek'),
      nextDay: i18next.t('component.dateTime.calendar.nextDay'),
      nextWeek: i18next.t('component.dateTime.calendar.nextWeek'),
      lastDay: i18next.t('component.dateTime.calendar.lastDay'),
      lastWeek: i18next.t('component.dateTime.calendar.lastWeek'),
      sameElse: i18next.t('component.dateTime.calendar.sameElse')
    })
}

export default React.memo(Calendar)
