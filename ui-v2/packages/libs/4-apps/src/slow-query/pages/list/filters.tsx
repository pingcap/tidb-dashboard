import { FilterMultiSelect } from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import { useTn } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import {
  Group,
  Select,
  Text,
  TextInput,
  UnstyledButton,
} from "@tidbcloud/uikit"
import { TimeRangePicker } from "@tidbcloud/uikit/biz"
import { IconXClose } from "@tidbcloud/uikit/icons"
import dayjs from "dayjs"
import { useEffect, useState } from "react"

import { useListUrlState } from "../../url-state/list-url-state"
import { useDbsData, useListData, useRuGroupsData } from "../../utils/use-data"

const SLOW_QUERY_LIMIT = [100, 200, 500, 1000].map((l) => ({
  value: `${l}`,
  label: `Limit ${l}`,
}))

const QUICK_RANGES: number[] = [
  5 * 60, // 5 mins
  15 * 60,
  30 * 60,
  60 * 60,
  6 * 60 * 60,
  12 * 60 * 60,
  24 * 60 * 60,
  // 2 * 24 * 60 * 60,
  // 3 * 24 * 60 * 60, // 3 days
  // 7 * 24 * 60 * 60, // 7 days
]

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
          .toDate()
      }
      maxDateTime={() => dayjs().toDate()}
      loading={isFetching}
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
          !!text && (
            <IconXClose
              style={{ cursor: "pointer" }}
              size={14}
              onClick={() => {
                setText("")
                setTerm(undefined)
              }}
            />
          )
        }
        disabled={isFetching}
      />
    </form>
  )

  const resetFiltersBtn = (
    <UnstyledButton
      onClick={reset}
      sx={(theme) => ({ color: theme.colors.carbon[7] })}
    >
      <Text size="sm" fw="bold">
        {tt("Clear Filters")}
      </Text>
    </UnstyledButton>
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
