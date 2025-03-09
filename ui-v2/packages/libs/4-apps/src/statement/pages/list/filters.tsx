import {
  FilterMultiSelect,
  TimeRangePicker,
} from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import { useTn } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { Button, CloseButton, Group, TextInput } from "@tidbcloud/uikit"
import { IconCornerDownLeft } from "@tidbcloud/uikit/icons"
import { dayjs } from "@tidbcloud/uikit/utils"
import { useEffect, useState } from "react"

import { useListUrlState } from "../../shared-state/list-url-state"
import { QUICK_RANGES } from "../../utils/constants"
import {
  useDbsData,
  useListData,
  useRuGroupsData,
  useStmtKindsData,
} from "../../utils/use-data"

export function Filters() {
  const {
    timeRange,
    setTimeRange,
    dbs,
    setDbs,
    ruGroups,
    setRuGroups,
    kinds,
    setKinds,
    term,
    setTerm,
    resetFilters,
  } = useListUrlState()

  const [text, setText] = useState(term)
  useEffect(() => {
    setText(term)
  }, [term])

  const { isFetching } = useListData()
  const { data: dbsData } = useDbsData()
  const { data: ruGroupsData } = useRuGroupsData()
  const { data: stmtKindsData } = useStmtKindsData()
  const { tt } = useTn("statement")

  function handleSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setTerm(text)
  }

  function reset() {
    setText("")
    resetFilters()
  }

  const timeRangePicker = (
    <TimeRangePicker
      value={timeRange}
      onChange={(v) => {
        setTimeRange(v)
      }}
      quickRanges={QUICK_RANGES}
      minDateTime={() =>
        dayjs()
          .subtract(QUICK_RANGES[QUICK_RANGES.length - 1], "seconds")
          .startOf("d")
          .toDate()
      }
      maxDateTime={() => dayjs().endOf("d").toDate()}
      disabled={isFetching}
    />
  )

  const dbsSelect = dbsData && dbsData.length > 0 && (
    <FilterMultiSelect
      kind="Databases"
      data={dbsData}
      value={dbs}
      onChange={setDbs}
      width={200}
      disabled={isFetching}
    />
  )

  // ignore `default` resource group
  const ruGroupsSelect = ruGroupsData && ruGroupsData.length > 1 && (
    <FilterMultiSelect
      kind="Resource Groups"
      data={ruGroupsData}
      value={ruGroups}
      onChange={setRuGroups}
      width={240}
      disabled={isFetching}
    />
  )

  const stmtKindsSelect = stmtKindsData && stmtKindsData.length > 0 && (
    <FilterMultiSelect
      kind="Statement Kinds"
      data={stmtKindsData}
      value={kinds}
      onChange={setKinds}
      width={240}
      disabled={isFetching}
    />
  )

  const searchInput = (
    <form onSubmit={handleSearchSubmit}>
      <TextInput
        w={200}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={tt("Find SQL text")}
        rightSection={
          text ? (
            <CloseButton
              size="sm"
              onMouseDown={(e) => e.preventDefault()} // to prevent the input lose focus
              onClick={() => {
                setText("")
                setTerm(undefined)
              }}
            />
          ) : (
            <IconCornerDownLeft />
          )
        }
        disabled={isFetching}
      />
    </form>
  )

  const resetFiltersBtn = (
    <Button variant="subtle" onClick={reset}>
      {tt("Clear Filters")}
    </Button>
  )

  return (
    <Group>
      {timeRangePicker}
      {dbsSelect}
      {ruGroupsSelect}
      {stmtKindsSelect}
      {searchInput}
      {resetFiltersBtn}
    </Group>
  )
}
