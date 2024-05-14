// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.
import { mixpanel } from '@lib/utils/telemetry'

export const telemetry = {
  clickTopSlowQueryTab() {
    mixpanel.track('Slowquery: Click TopSlowquery Tab')
  },
  clickTableRow() {
    mixpanel.track('Slowquery: Click Table Row')
  },
  clickQueryButton() {
    mixpanel.track('Slowquery: Click Query Button')
  },

  clickPlanTabs(tab: string, queryDigest: string) {
    mixpanel.track('Slowquery: Plan Tab Clicked', { tab, queryDigest })
  },
  toggleVisualPlanModal(action: 'open' | 'close') {
    mixpanel.track('Slowquery: Visual Plan Modal Toggled', { action })
  },
  toggleExpandBtnOnNode(nodeName: string) {
    mixpanel.track('Slowquery: Node Button Toggled', { nodeName })
  },
  clickNode(nodeName: string) {
    mixpanel.track('Slowquery: Node Clicked', { nodeName })
  },
  clickTabOnNodeDetail(tab: string) {
    mixpanel.track('Slowquery: Detail Tab on Node Clicked', { tab })
  }
}
