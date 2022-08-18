import { TimeRange } from '@lib/components'
import { mixpanel } from '@lib/utils/telemetry'

export const telemetry = {
  // time range picker
  clickZoomOut(timestamps: [number, number]) {
    mixpanel.track('Overview: Click Zoom Out Button', { timestamps })
  },
  openTimeRangePicker() {
    mixpanel.track('Overview: Open Time Range Picker')
  },
  selectTimeRange(v: TimeRange) {
    mixpanel.track('Overview: Select Time Range', v)
  },
  clickManualRefresh() {
    mixpanel.track('Overview: Click Manual Refresh')
  },
  clickAutoRefresh() {
    mixpanel.track('Overview: Click Auto Refresh Dropdown')
  },
  selectAutoRefreshOption(seconds: number) {
    mixpanel.track('Overview: Select Auto Refresh Option', { seconds })
  },
  clickDocumentationIcon() {
    mixpanel.track('Overview: Click Documentation Icon')
  },
  clickViewMoreMetrics() {
    mixpanel.track('Overview: Click View More Metrics Button')
  }
}
