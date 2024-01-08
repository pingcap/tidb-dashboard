// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.
import { ConprofContinuousProfilingConfig } from '@lib/client'
import { mixpanel } from '@lib/utils/telemetry'
import { Dayjs } from 'dayjs'

export const telemetry = {
  clickSettings(type: 'firstTimeTips' | 'settingIcon') {
    mixpanel.track('Conprof: Click Settings', { type })
  },
  saveSettings(settings: ConprofContinuousProfilingConfig) {
    mixpanel.track('Conprof: Save Settings', { settings })
  },
  openTimeRangePicker() {
    mixpanel.track('Conprof: Open Time Range Picker')
  },
  selectTimeRange(date: string = 'now') {
    mixpanel.track('Conprof: Select Time Range', { date })
  },
  clickQueryButton(endTime?: Dayjs) {
    mixpanel.track('Conprof: Click Query Button', {
      endTime: endTime?.toString() || 'now'
    })
  },
  clickReloadIcon(endTime?: Dayjs) {
    mixpanel.track('Conprof: Click Reload Icon', {
      endTime: endTime?.toString() || 'now'
    })
  },
  clickProfilingListRecord(record) {
    mixpanel.track('Conprof: Click Profiling List Record', {
      record
    })
  },
  // conprof detail
  clickAction(data: {
    action: string
    component: string
    profile_type: string
  }) {
    mixpanel.track('Conprof Detail: Click Action', data)
  },
  downloadProfilingGroupResult() {
    mixpanel.track('Conprof Detail: Download Profiling Group Result')
  }
}
