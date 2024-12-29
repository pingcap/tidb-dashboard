import { formatTime } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { Alert } from "@tidbcloud/uikit"
import { useMemo } from "react"

import { StatementModel } from "../../models"

export function TimeRangeFixAlert({ data }: { data: StatementModel[] }) {
  const maxTime = useMemo(
    () =>
      data.reduce(
        (max, d) => (d.summary_end_time! > max ? d.summary_end_time! : max),
        0,
      ),
    [data],
  )
  const minTime = useMemo(
    () =>
      data.reduce(
        (min, d) => (d.summary_begin_time! < min ? d.summary_begin_time! : min),
        maxTime,
      ),
    [data, maxTime],
  )

  if (minTime !== maxTime) {
    return (
      <Alert>
        Based on the setting, the real data time range is from{" "}
        {formatTime(minTime * 1000)} to {formatTime(maxTime * 1000)}
      </Alert>
    )
  }

  return null
}
