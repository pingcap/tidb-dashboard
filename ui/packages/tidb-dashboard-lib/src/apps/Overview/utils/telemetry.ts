import { TimeRange } from '@lib/components'
import { mixpanel } from '@lib/utils/telemetry'

export const telemetry = {
  // time range picker
  clickZoomOut(timestamps: [number, number]) {
    mixpanel.track('Overview: Click Zoom Out Button', { timestamps })
  },
  selectTimeRange(v: TimeRange) {
    mixpanel.track('Overview: Select Time Range', v)
  },
  clickManualRefresh() {
    mixpanel.track('Overview: Click Manual Refresh')
  },
  selectAutoRefreshOption(seconds: number) {
    mixpanel.track('Overview: Select Auto Refresh Option', { seconds })
  },
  clickDocumentationIcon() {
    mixpanel.track('Overview: Click Documentation Icon')
  },
  clickViewMoreMetrics() {
    mixpanel.track('Overview: Click View More Metrics Button')
  },
  clickSeriesLabel(chartTitle: string, seriesName: string) {
    mixpanel.track('Overview: Click to Hide Series', { chartTitle, seriesName })
  }
}
