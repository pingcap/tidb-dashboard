import { useTn } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { Button, Tooltip } from "@tidbcloud/uikit"
import { useMemo } from "react"

import { useAppContext } from "../../ctx"
import { useDetailUrlState } from "../../shared-state/detail-url-state"

export function RelatedStatementButton({ dbName }: { dbName: string }) {
  const { id } = useDetailUrlState()
  const ctx = useAppContext()
  const statementId = useMemo(() => {
    const [sqlDigest, _connectionId, _timestamp, from, to] = id.split(",")
    return [from, to, sqlDigest, dbName].join(",")
  }, [id, dbName])
  const { tt } = useTn("slow-query")

  return (
    <Tooltip
      label={tt(
        "View related statement in statement page, but it may be evicted already, so the result maybe empty",
      )}
    >
      <Button
        variant="default"
        onClick={() => ctx.actions.openStatement(statementId)}
      >
        {tt("View related statement")}
      </Button>
    </Tooltip>
  )
}
