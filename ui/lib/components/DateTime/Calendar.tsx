import React from 'react'
import { Tooltip } from 'antd'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import { addTranslationResource } from '@lib/utils/i18n'
import i18next from 'i18next'
import { format as longFormat } from './Long'
import { IDateTimeProps } from '.'

import calendar from 'dayjs/plugin/calendar'
import localizedFormat from 'dayjs/plugin/localizedFormat'

dayjs.extend(calendar)
dayjs.extend(localizedFormat)

const translations = {
  en: {
    sameDay: '[Today at] h:mm A',
    nextDay: '[Tomorrow] h:mm A',
    nextWeek: 'dddd h:mm A',
    lastDay: '[Yesterday] h:mm A',
    lastWeek: '[Last] dddd h:mm A',
    sameElse: 'lll',
  },
  'zh-CN': {
    sameDay: '[今天] HH:mm',
    nextDay: '[明天] HH:mm',
    nextWeek: '[下]dddd HH:mm',
    lastDay: '[昨天] HH:mm',
    lastWeek: '[上]dddd HH:mm',
    sameElse: 'lll',
  },
}

for (const key in translations) {
  addTranslationResource(key, {
    component: {
      dateTime: {
        calendar: translations[key],
      },
    },
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
    nextDay: i18next.t('component.dateTime.calendar.nextDay'),
    nextWeek: i18next.t('component.dateTime.calendar.nextWeek'),
    lastDay: i18next.t('component.dateTime.calendar.lastDay'),
    lastWeek: i18next.t('component.dateTime.calendar.lastWeek'),
    sameElse: i18next.t('component.dateTime.calendar.sameElse'),
  })
}

export default Calendar
