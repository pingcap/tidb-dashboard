import { FilterMultiSelect } from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import { useTn } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { Group } from "@tidbcloud/uikit"

import {
  MemoryStateResetButton,
  UrlStateSearchInput,
  UrlStateTimeRangePicker,
} from "../../../_shared/state-filters"
import { useListUrlState } from "../../shared-state/list-url-state"
import {
  useDbsData,
  useRuGroupsData,
  useStmtKindsData,
} from "../../utils/use-data"

function DBsSelect() {
  const { dbs, setDbs } = useListUrlState()
  const { data: dbsData } = useDbsData()

  return (
    dbsData &&
    dbsData.length > 0 && (
      <FilterMultiSelect
        kind="Databases"
        data={dbsData}
        value={dbs}
        onChange={setDbs}
        width={200}
      />
    )
  )
}

function RuGroupsSelect() {
  const { ruGroups, setRuGroups } = useListUrlState()
  const { data: ruGroupsData } = useRuGroupsData()

  // ignore `default` resource group
  return (
    ruGroupsData &&
    ruGroupsData.length > 1 && (
      <FilterMultiSelect
        kind="Resource Groups"
        data={ruGroupsData}
        value={ruGroups}
        onChange={setRuGroups}
        width={240}
      />
    )
  )
}

function StmtKindsSelect() {
  const { kinds, setKinds } = useListUrlState()
  const { data: stmtKindsData } = useStmtKindsData()

  return (
    stmtKindsData &&
    stmtKindsData.length > 0 && (
      <FilterMultiSelect
        kind="Statement Kinds"
        data={stmtKindsData}
        value={kinds}
        onChange={setKinds}
        width={240}
      />
    )
  )
}

export function Filters() {
  const { tt } = useTn("statement")

  return (
    <Group>
      <UrlStateTimeRangePicker />
      <DBsSelect />
      <RuGroupsSelect />
      <StmtKindsSelect />
      <UrlStateSearchInput placeholder={tt("Find SQL text")} />
      <MemoryStateResetButton text={tt("Clear Filters")} />
    </Group>
  )
}
