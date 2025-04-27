import { useTn } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { Button, Tooltip } from "@tidbcloud/uikit"
import { useMemo } from "react"

import { useAppContext } from "../../ctx"
import { useDetailUrlState } from "../../shared-state/detail-url-state"
import { useDetailData } from "../../utils/use-data"

export function RelatedStatementButton() {
  const ctx = useAppContext()
  const { id } = useDetailUrlState()
  const { data: detailData } = useDetailData()
  const statementId = useMemo(() => {
    const [sqlDigest, _connectionId, _timestamp, from, to] = id.split(",")
    return [from, to, sqlDigest, detailData?.db].join(",")
  }, [id, detailData?.db])
  const { tt } = useTn("slow-query")

  if (!detailData) {
    return null
  }

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
