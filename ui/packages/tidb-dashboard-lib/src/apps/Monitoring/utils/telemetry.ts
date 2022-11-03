import { TimeRange } from '@lib/components'
import { mixpanel } from '@lib/utils/telemetry'

export const telemetry = {
  // time range picker
  clickZoomOut(timestamps: [number, number]) {
    mixpanel.track('Monitoring: Click Zoom Out Button', { timestamps })
  },
  selectTimeRange(v: TimeRange) {
    mixpanel.track('Monitoring: Select Time Range', v)
  },
  clickManualRefresh() {
    mixpanel.track('Monitoring: Click Manual Refresh')
  },
  selectAutoRefreshOption(seconds: number) {
    mixpanel.track('Monitoring: Select Auto Refresh Option', { seconds })
  },
  clickDocumentationIcon() {
    mixpanel.track('Monitoring: Click Documentation Icon')
  },
  clickSeriesLabel(chartTitle: string, seriesName: string) {
    mixpanel.track('Monitoring: Click to Hide Series', {
      chartTitle,
      seriesName
    })
  }
}
