import {
  formatTime,
  toTimeRangeValue,
} from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { Alert } from "@tidbcloud/uikit"
import { useMemo } from "react"

import { useListUrlState } from "../../url-state/list-url-state"
import { MAX_TIME_RANGE_DURATION_SECONDS } from "../../utils/constants"

export function TimeRangeClipAlert() {
  const { timeRange } = useListUrlState()
  const tr = useMemo(() => toTimeRangeValue(timeRange), [timeRange])
  const beyondTimeLimit = tr[1] - tr[0] > MAX_TIME_RANGE_DURATION_SECONDS

  if (!beyondTimeLimit) {
    return null
  }

  return (
    <Alert>
      Because of the limitation, the time range is clipped to max 24 hours, from{" "}
      {formatTime(tr[0] * 1000)} to{" "}
      {formatTime((tr[0] + MAX_TIME_RANGE_DURATION_SECONDS) * 1000)}
    </Alert>
  )
}
