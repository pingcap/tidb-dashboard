import { TimeRange } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { useMemo } from "react"

import { AppProvider, SqlHistoryCard } from "../../../_shared/sql-history"
import { useAppContext } from "../../ctx"
import { useDetailUrlState } from "../../shared-state/detail-url-state"

export function SqlHistory({ sqlDigest }: { sqlDigest: string }) {
  const ctx = useAppContext()

  const { id } = useDetailUrlState()
  const initialTimeRange = useMemo<TimeRange>(() => {
    const [_sqlDigest, _connectionId, _timestamp, from, to] = id.split(",")
    return { type: "absolute", value: [Number(from), Number(to)] }
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
