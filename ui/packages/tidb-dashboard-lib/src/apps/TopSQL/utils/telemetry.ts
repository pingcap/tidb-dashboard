// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.
import { mixpanel } from '@lib/utils/telemetry'
import { TimeRange } from '@lib/components'
import { TopsqlEditableConfig } from '@lib/client'

export const telemetry = {
  openSelectInstance() {
    mixpanel.track('TopSQL: Open Select Instance')
  },
  finishSelectInstance(type: string) {
    mixpanel.track('TopSQL: Finish Select Instance', { type })
  },
  openTimeRangePicker() {
    mixpanel.track('TopSQL: Open Time Range Picker')
  },
  selectTimeRange(v: TimeRange) {
    mixpanel.track('TopSQL: Select Time Range', v)
  },
  clickZoomOut(timestamps: [number, number]) {
    mixpanel.track('TopSQL: Click Zoom Out Button', { timestamps })
  },
  dndZoomIn(timestamps: [number, number]) {
    mixpanel.track('TopSQL: Drag & Drop Zoom In', { timestamps })
  },
  clickRefresh() {
    mixpanel.track('TopSQL: Click Refresh')
  },
  clickAutoRefresh() {
    mixpanel.track('TopSQL: Click Auto Refresh Dropdown')
  },
  selectAutoRefreshOption(seconds: number) {
    mixpanel.track('TopSQL: Select Auto Refresh Option', { seconds })
  },
  clickSettings(type: 'firstTimeTips' | 'settingIcon' | 'bannerTips') {
    mixpanel.track('TopSQL: Click Settings', { type })
  },
  saveSettings(settings: TopsqlEditableConfig) {
    mixpanel.track('TopSQL: Save Settings', { settings })
  },
  clickStatement(index: number, isOther: boolean) {
    mixpanel.track('TopSQL: Click Statement', {
      rank: index + 1,
      isOther
    })
  },
  clickPlan(index: number) {
    mixpanel.track('TopSQL: Click Plan', { rank: index + 1 })
  }
}
