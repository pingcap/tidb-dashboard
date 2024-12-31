import { formatTime } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { Alert } from "@tidbcloud/uikit"

import { useTimeRangeValueState } from "../../shared-state/memory-state"

export function TimeRangeClipAlert() {
  const trv = useTimeRangeValueState((s) => s.trv)
  const beyondMax = useTimeRangeValueState((s) => s.beyondMax)

  if (!beyondMax) {
    return null
  }

  return (
    <Alert>
      Because of the limitation, the time range is clipped to max 24 hours, from{" "}
      {formatTime(trv[0] * 1000)} to {formatTime(trv[1] * 1000)}
    </Alert>
  )
}
