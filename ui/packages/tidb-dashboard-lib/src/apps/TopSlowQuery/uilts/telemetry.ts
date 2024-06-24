// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.
import { mixpanel } from '@lib/utils/telemetry'

export const telemetry = {
  clickSlowQueryTab() {
    mixpanel.track('TopSlowquery: Click Slowquery Tab')
  },

  changeDuration(duration: number) {
    mixpanel.track('TopSlowquery: Change Duration', { duration })
  },
  changeTimeRange() {
    mixpanel.track('TopSlowquery: Change Time Range')
  },

  changeDatabases() {
    mixpanel.track('TopSlowquery: Change Databases')
  },
  changeStmtKinds() {
    mixpanel.track('TopSlowquery: Change Statement Kinds')
  },
  changeOrder() {
    mixpanel.track('TopSlowquery: Change Order')
  },

  clickTableRow() {
    mixpanel.track('TopSlowquery: Click Table Row')
  }
}
