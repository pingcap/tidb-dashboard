import { formatTime, useTn } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { Alert } from "@tidbcloud/uikit"

import { useTimeRangeValueState } from "../../shared-state/memory-state"

export function TimeRangeClipAlert() {
  const { tt } = useTn("slow-query")
  const trv = useTimeRangeValueState((s) => s.trv)
  const beyondMax = useTimeRangeValueState((s) => s.beyondMax)

  if (!beyondMax) {
    return null
  }

  return (
    <Alert p={8}>
      {tt(
        "Due to the limitation, currently only support to query max 24 hours data, so the actual time range is {{begin}} to {{end}}",
        {
          begin: formatTime(trv[0] * 1000),
          end: formatTime(trv[1] * 1000),
        },
      )}
    </Alert>
  )
}
