import { TimeRange } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { useMemo } from "react"

import { AppProvider, SqlHistoryCard } from "../../../_shared/sql-history"
import { useAppContext } from "../../ctx"
import { useDetailUrlState } from "../../shared-state/detail-url-state"

export function SqlHistory({ sqlDigest }: { sqlDigest: string }) {
  const ctx = useAppContext()

  const { id } = useDetailUrlState()
  const initialTimeRange = useMemo<TimeRange>(() => {
    const [summary_begin_time, summary_end_time, _digest, _schema_name] =
      id.split(",")
    return {
      type: "absolute",
      value: [Number(summary_begin_time), Number(summary_end_time)],
    }
  }, [id])

  const ctxValue = useMemo(
    () => ({
      ...ctx,
      sqlDigest,
      initialTimeRange,
    }),
    [ctx, sqlDigest, initialTimeRange],
  )

  return (
    <AppProvider ctxValue={ctxValue}>
      <SqlHistoryCard />
    </AppProvider>
  )
}
