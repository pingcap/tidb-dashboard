import { AppProvider, SqlLimitCard } from "../../../_shared/sql-limit"
import { useAppContext } from "../../ctx"

export function SqlLimit({ sqlDigest }: { sqlDigest: string }) {
  const ctx = useAppContext()

  return (
    <AppProvider ctxValue={ctx}>
      <SqlLimitCard sqlDigest={sqlDigest} />
    </AppProvider>
  )
}
