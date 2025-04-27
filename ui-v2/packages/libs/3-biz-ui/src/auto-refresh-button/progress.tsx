import { RingProgress } from "@tidbcloud/uikit"

export function RefreshProgress({ value }: { value: number }) {
  return (
    <RingProgress
      ml={-4}
      mr={-4}
      size={22}
      thickness={4}
      rootColor="carbon.5"
      sections={[{ value, color: "carbon.8" }]}
    />
  )
}
