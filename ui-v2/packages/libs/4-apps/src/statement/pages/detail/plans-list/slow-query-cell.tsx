import { Anchor } from "@tidbcloud/uikit"

import { useAppContext } from "../../../ctx"
import { useDetailUrlState } from "../../../url-state/detail-url-state"

export function SlowQueryCell({ planDigest }: { planDigest: string }) {
  const ctx = useAppContext()
  const { id } = useDetailUrlState()
  const newId = `${id},${planDigest}`

  return (
    <Anchor
      onClick={() => {
        ctx.actions.openSlowQueryList(newId)
      }}
    >
      Slow Queries
    </Anchor>
  )
}
