import { useMemo } from "react"

import { AppProvider, SqlLimitCard } from "../../../_shared/sql-limit"
import { useAppContext } from "../../ctx"

export function SqlLimit({ sqlDigest }: { sqlDigest: string }) {
  const ctx = useAppContext()

  const ctxValue = useMemo(
    () => ({
      ...ctx,
      sqlDigest,
    }),
    [ctx, sqlDigest],
  )

  return (
    <AppProvider ctxValue={ctxValue}>
      <SqlLimitCard />
    </AppProvider>
  )
}
