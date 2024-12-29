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
import { QUICK_RANGES } from "../../utils/constants"
import { useListData } from "../../utils/use-data"

import { AdvancedFiltersModal } from "./advanced-filters-modal"

const SLOW_QUERY_LIMIT = [100, 200, 500, 1000].map((l) => ({
  value: `${l}`,
  label: `Limit ${l}`,
}))

export function FiltersWithAdvanced() {
  const {
    timeRange,
    setTimeRange,
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

  const searchInput = (
    <form onSubmit={handleSearchSubmit}>
      <TextInput
        w={280}
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

  const advancedFiltersModal = <AdvancedFiltersModal />

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
      {searchInput}
      {advancedFiltersModal}
      {resetFiltersBtn}
    </Group>
  )
}
