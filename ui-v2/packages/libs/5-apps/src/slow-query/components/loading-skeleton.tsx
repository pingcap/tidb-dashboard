import {
  Group,
  Skeleton,
} from "@pingcap-incubator/tidb-dashboard-lib-primitive-ui"

export function LoadingSkeleton() {
  return (
    <Group spacing="xs">
      <Skeleton height={10} />
      <Skeleton height={10} />
      <Skeleton height={10} width="70%" />
    </Group>
  )
}
