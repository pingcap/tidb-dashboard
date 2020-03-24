import React from 'react'
import { Tooltip } from 'antd'
import dayjs from 'dayjs'
import { withTranslation } from 'react-i18next'
import { addTranslationResource } from '@/utils/i18n'
import i18next from 'i18next'
import { format as longFormat } from './Long'

dayjs.extend(require('dayjs/plugin/calendar'))
dayjs.extend(require('dayjs/plugin/localizedFormat'))

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

@withTranslation() // Re-render when language changes
class Calendar extends React.PureComponent {
  render() {
    const { unixTimeStampMs, ...rest } = this.props
    return (
      <Tooltip title={longFormat(unixTimeStampMs)} {...rest}>
        {format(unixTimeStampMs)}
      </Tooltip>
    )
  }
}

export function format(unixTimeStampMs) {
  return dayjs(unixTimeStampMs).calendar(null, {
    sameDay: i18next.t('component.dateTime.calendar.sameDay'),
    nextDay: i18next.t('component.dateTime.calendar.nextDay'),
    nextWeek: i18next.t('component.dateTime.calendar.nextWeek'),
    lastDay: i18next.t('component.dateTime.calendar.lastDay'),
    lastWeek: i18next.t('component.dateTime.calendar.lastWeek'),
    sameElse: i18next.t('component.dateTime.calendar.sameElse'),
  })
}

export default Calendar
