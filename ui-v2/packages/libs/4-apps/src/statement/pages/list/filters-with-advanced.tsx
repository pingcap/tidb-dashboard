import { TimeRangePicker } from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import { useTn } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { Button, Group, TextInput } from "@tidbcloud/uikit"
import {
  IconCornerDownLeft,
  IconSearchSm,
  IconXClose,
} from "@tidbcloud/uikit/icons"
import { dayjs } from "@tidbcloud/uikit/utils"
import { useEffect, useState } from "react"

import { useListUrlState } from "../../shared-state/list-url-state"
import { QUICK_RANGES } from "../../utils/constants"
import { useListData } from "../../utils/use-data"

import { AdvancedFiltersModal } from "./advanced-filters-modal"

export function FiltersWithAdvanced() {
  const { timeRange, setTimeRange, term, setTerm, resetFilters } =
    useListUrlState()

  const [text, setText] = useState(term)
  useEffect(() => {
    setText(term)
  }, [term])

  const { isFetching } = useListData()
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

  const searchInput = (
    <form onSubmit={handleSearchSubmit}>
      <TextInput
        w={280}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={tt("Find SQL text")}
        leftSection={<IconSearchSm />}
        rightSection={
          text ? (
            <IconXClose
              style={{ cursor: "pointer" }}
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

  const advancedFiltersModal = <AdvancedFiltersModal />

  const resetFiltersBtn = (
    <Button variant="subtle" onClick={reset}>
      {tt("Clear Filters")}
    </Button>
  )

  return (
    <Group>
      {timeRangePicker}
      {searchInput}
      {advancedFiltersModal}
      {resetFiltersBtn}
    </Group>
  )
}
