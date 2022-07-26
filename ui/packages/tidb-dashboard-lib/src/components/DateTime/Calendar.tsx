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
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(calendar)
dayjs.extend(weekOfYear)
dayjs.extend(localizedFormat)
dayjs.extend(timezone)

const translations = {
  en: {
    sameDay: '[Today at] h:mm A (z)',
    sameWeek: 'dddd h:mm A (z)',
    nextDay: '[Tomorrow] h:mm A (z)',
    nextWeek: '[Next] dddd h:mm A (z)',
    lastDay: '[Yesterday] h:mm A (z)',
    lastWeek: '[Last] dddd h:mm A (z)',
    sameElse: 'lll (z)'
  },
  zh: {
    sameDay: '[今天] HH:mm (z)',
    sameWeek: 'dddd HH:mm (z)',
    nextDay: '[明天] HH:mm (z)',
    nextWeek: '[下]dddd HH:mm (z)',
    lastDay: '[昨天] HH:mm (z)',
    lastWeek: '[上]dddd HH:mm (z)',
    sameElse: 'lll (z)'
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
  return dayjs(unixTimestampMs).calendar(undefined, {
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
