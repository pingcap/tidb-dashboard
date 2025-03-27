import { FilterMultiSelect } from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import { useTn } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { Group, Select, TextInput } from "@tidbcloud/uikit"

import {
  MemoryStateResetButton,
  UrlStateSearchInput,
  UrlStateTimeRangePicker,
} from "../../../_shared/state-filters"
import { useListUrlState } from "../../shared-state/list-url-state"
import { useDbsData, useRuGroupsData } from "../../utils/use-data"

const SLOW_QUERY_LIMIT = [100, 200, 500, 1000].map((l) => ({
  value: `${l}`,
  label: `Limit ${l}`,
}))

function LimitSelect() {
  const { limit, setLimit } = useListUrlState()

  return (
    <Select
      w={160}
      value={String(limit)}
      onChange={(v) => setLimit(v!)}
      data={SLOW_QUERY_LIMIT}
    />
  )
}

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

function SqlDigestInput() {
  const { tt } = useTn("slow-query")
  const { sqlDigest } = useListUrlState()

  return (
    sqlDigest && (
      <TextInput
        w={200}
        defaultValue={sqlDigest}
        placeholder={tt("SQL digest")}
        disabled={true}
      />
    )
  )
}

export function Filters() {
  const { tt } = useTn("slow-query")

  return (
    <Group>
      <UrlStateTimeRangePicker />
      <LimitSelect />
      <DBsSelect />
      <RuGroupsSelect />
      <SqlDigestInput />
      <UrlStateSearchInput placeholder={tt("Find SQL text")} />
      <MemoryStateResetButton text={tt("Clear Filters")} />
    </Group>
  )
}
