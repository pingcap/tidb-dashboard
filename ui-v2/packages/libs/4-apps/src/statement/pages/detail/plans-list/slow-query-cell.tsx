import { useTn } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { Anchor } from "@tidbcloud/uikit"

import { useAppContext } from "../../../ctx"
import { useDetailUrlState } from "../../../shared-state/detail-url-state"

export function SlowQueryCell({ planDigest }: { planDigest: string }) {
  const { tt } = useTn("statement")
  const ctx = useAppContext()
  const { id } = useDetailUrlState()
  const newId = `${id},${planDigest}`

  return (
    <Anchor
      onClick={() => {
        ctx.actions.openSlowQueryList(newId)
      }}
    >
      {tt("Slow Queries")}
    </Anchor>
  )
}
