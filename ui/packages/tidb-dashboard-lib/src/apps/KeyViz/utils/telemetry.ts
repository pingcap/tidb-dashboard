import { mixpanel } from '@lib/utils/telemetry'

export const telemetry = {
  changeLight() {
    mixpanel.track('KeyViz: Change Light')
  },
  clickManualRefresh() {
    mixpanel.track('KeyViz: Click Manual Refresh')
  },
  clickAutoRefresh() {
    mixpanel.track('KeyViz: Clikc Auto Refresh')
  },
  changeTimeDuration(duration: number) {
    mixpanel.track('KeyViz: Change Time Duration', { duration })
  },
  changeMetric(metric: string) {
    mixpanel.track('KeyViz: Change Metric', { metric })
  },
  changeBright(bright: number) {
    mixpanel.track('KeyViz: Change Bright', { bright })
  },
  toggleBrush() {
    mixpanel.track('KeyViz: Toggle Brush')
  },
  resetZoom() {
    mixpanel.track('KeyViz: Reset Zoom')
  },
  openSetting() {
    mixpanel.track('KeyViz: Open Setting')
  },
  openHelp() {
    mixpanel.track('KeyViz: Open Help')
  }
}
