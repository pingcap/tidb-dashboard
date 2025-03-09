import {
  FilterMultiSelect,
  TimeRangePicker,
} from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import { useTn } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { Button, CloseButton, Group, Select, TextInput } from "@tidbcloud/uikit"
import { IconCornerDownLeft } from "@tidbcloud/uikit/icons"
import { dayjs } from "@tidbcloud/uikit/utils"
import { useEffect, useState } from "react"

import { useListUrlState } from "../../shared-state/list-url-state"
import { QUICK_RANGES } from "../../utils/constants"
import { useDbsData, useListData, useRuGroupsData } from "../../utils/use-data"

const SLOW_QUERY_LIMIT = [100, 200, 500, 1000].map((l) => ({
  value: `${l}`,
  label: `Limit ${l}`,
}))

export function Filters() {
  const {
    timeRange,
    setTimeRange,
    dbs,
    setDbs,
    ruGroups,
    setRuGroups,
    sqlDigest,
    limit,
    setLimit,
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
  const { tt } = useTn("slow-query")

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

  const limitSelect = (
    <Select
      w={160}
      value={limit + ""}
      onChange={(v) => setLimit(v!)}
      data={SLOW_QUERY_LIMIT}
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

  const sqlDigestInput = sqlDigest && (
    <TextInput
      w={200}
      defaultValue={sqlDigest}
      placeholder={tt("SQL digest")}
      disabled={true}
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
      {limitSelect}
      {dbsSelect}
      {ruGroupsSelect}
      {sqlDigestInput}
      {searchInput}
      {resetFiltersBtn}
    </Group>
  )
}
