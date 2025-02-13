import { Skeleton, Stack } from "@tidbcloud/uikit"

export function LoadingSkeleton() {
  return (
    <Stack gap="xs">
      <Skeleton height={10} />
      <Skeleton height={10} />
      <Skeleton height={10} width="70%" />
    </Stack>
  )
}
