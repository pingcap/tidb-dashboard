import { Card, Skeleton } from "@tidbcloud/uikit"

export function LoadingCard() {
  return (
    <Card p={16} bg="carbon.0">
      <Skeleton visible={true} h={290} />
    </Card>
  )
}
