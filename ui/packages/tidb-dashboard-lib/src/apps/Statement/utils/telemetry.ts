import { IColumnKeys, TimeRange } from '@lib/components'
import { mixpanel } from '@lib/utils/telemetry'

export const telemetry = {
  // list
  changeTimeRange(t: TimeRange) {
    mixpanel.track('Statement: Change Time Range Filter', { t })
  },
  changeDatabases() {
    mixpanel.track('Statement: Change Databases Filter')
  },
  changeStmtTypes() {
    mixpanel.track('Statement: Change Stmt Types Filter')
  },
  changeSearchText() {
    mixpanel.track('Statement: Change Search Text')
  },
  search() {
    mixpanel.track('Statement: Search')
  },
  changeVisibleColumns(columns: IColumnKeys) {
    mixpanel.track('Statement: Change Visible Columns', { columns })
  },
  toggleShowFullSQL(showFull: boolean) {
    mixpanel.track('Statement: Toggle Show Full SQL', { showFull })
  },
  openSetting() {
    mixpanel.track('Statement: Open Setting')
  },
  export() {
    mixpanel.track('Statement: Export')
  },
  openHelp() {
    mixpanel.track('Statement: Open Help')
  },

  // detail
  switchDetailTab(tab: string) {
    mixpanel.track('Statement: Switch Detail Tab', { tab })
  },

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
  }
}
