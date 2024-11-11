import { Group, Skeleton } from "@tidbcloud/uikit"

export function LoadingSkeleton() {
  return (
    <Group spacing="xs">
      <Skeleton height={10} />
      <Skeleton height={10} />
      <Skeleton height={10} width="70%" />
    </Group>
  )
}
