import { useTn } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { Anchor, Card, Group } from "@tidbcloud/uikit"
import { IconLinkExternal01 } from "@tidbcloud/uikit/icons"
import { useMemo } from "react"

import { useAppContext } from "../../ctx"
import { useDetailUrlState } from "../../shared-state/detail-url-state"

export function RelatedStatement({ dbName }: { dbName: string }) {
  const { id } = useDetailUrlState()
  const ctx = useAppContext()
  const statementId = useMemo(() => {
    const [sqlDigest, _connectionId, _timestamp, from, to] = id.split(",")
    return [from, to, sqlDigest, dbName].join(",")
  }, [id, dbName])
  const { tt } = useTn("slow-query")

  return (
    <Card shadow="xs" p="md">
      <Anchor
        onClick={() => {
          ctx.actions.openStatement(statementId)
        }}
        w="fit-content"
      >
        <Group gap={4}>
          {tt(
            "View related statement in statement page (but it may be evicted already)",
          )}
          <IconLinkExternal01 />
        </Group>
      </Anchor>
    </Card>
  )
}
