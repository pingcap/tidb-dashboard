import { TimeRangePicker } from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import {
  useResetFiltersState,
  useSearchUrlState,
  useTimeRangeUrlState,
} from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { Button, CloseButton, TextInput } from "@tidbcloud/uikit"
import { IconCornerDownLeft, IconSearchSm } from "@tidbcloud/uikit/icons"
import { dayjs } from "@tidbcloud/uikit/utils"
import { useEffect, useState } from "react"

//////////////////////////////////////////////
// UrlStateTimeRangePicker
const QUICK_RANGES: number[] = [
  5 * 60, // 5 mins
  15 * 60,
  30 * 60,
  60 * 60,
  6 * 60 * 60,
  12 * 60 * 60,
  24 * 60 * 60,
  2 * 24 * 60 * 60,
  3 * 24 * 60 * 60, // 3 days
  7 * 24 * 60 * 60, // 7 days
]

export function UrlStateTimeRangePicker() {
  const { timeRange, setTimeRange } = useTimeRangeUrlState()

  return (
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
    />
  )
}

//////////////////////////////////////////////
// UrlStateSearchInput
export function UrlStateSearchInput({
  placeholder = "",
}: {
  placeholder: string
}) {
  const { term, setTerm } = useSearchUrlState()
  console.log("term:", term)

  const resetVal = useResetFiltersState((s) => s.resetVal)
  const [text, setText] = useState(term)

  // reset text when clicking `reset filters` button
  useEffect(() => {
    if (resetVal > 0) {
      setText("")
    }
  }, [resetVal])

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setTerm(text)
  }

  return (
    <form onSubmit={handleSearchSubmit}>
      <TextInput
        w={280}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        leftSection={<IconSearchSm />}
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
      />
    </form>
  )
}

//////////////////////////////////////////////
// MemoryStateResetButton
export function MemoryStateResetButton({ text }: { text: string }) {
  const reset = useResetFiltersState((s) => s.reset)
  return (
    <Button variant="subtle" onClick={reset}>
      {text}
    </Button>
  )
}
