import { Anchor, Card, Group } from "@tidbcloud/uikit"
import { IconLinkExternal01 } from "@tidbcloud/uikit/icons"

import { useAppContext } from "../../ctx"
import { useDetailUrlState } from "../../url-state/detail-url-state"

export function RelatedSlowQuery() {
  const { id, plans } = useDetailUrlState()
  const ctx = useAppContext()
  const newId = plans.length > 0 ? `${id},${plans.join(",")}` : id

  return (
    <Card shadow="xs" p="md">
      <Anchor
        onClick={() => {
          ctx.actions.openSlowQueryList(newId)
        }}
        w="fit-content"
      >
        <Group gap={4}>
          View related slow queries in slow query page
          <IconLinkExternal01 />
        </Group>
      </Anchor>
    </Card>
  )
}
