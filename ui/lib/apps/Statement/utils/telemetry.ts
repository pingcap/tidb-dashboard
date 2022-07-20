// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.
import { mixpanel } from '@lib/utils/telemetry'

export const telemetry = {
  clickPlanTabs(tab: string, queryDigest: string) {
    mixpanel.track('Statement: Plan Tab Clicked', { tab, queryDigest })
  },
  toggleVisualPlanModal(action: 'open' | 'close') {
    mixpanel.track('Statement: Visual Plan Modal Toggled', { action })
  },
  toggleExpandBtnOnNode(nodeName: string) {
    mixpanel.track('Statement: Node Button Toggled', { nodeName })
  },
  clickNode(nodeName: string) {
    mixpanel.track('Statement: Node Clicked', { nodeName })
  },
  clickTabOnNodeDetail(tab: string) {
    mixpanel.track('Statement: Detail Tab on Node Clicked', { tab })
  },
}
