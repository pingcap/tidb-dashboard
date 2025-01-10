import { Radio } from "@tidbcloud/uikit"

import { useDetailUrlState } from "../../../shared-state/detail-url-state"

export function PlanCheckCell({ planDigest }: { planDigest: string }) {
  const { plan, setPlan } = useDetailUrlState()

  const handleCheckChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    planDigest: string,
  ) => {
    const checked = e.target.checked
    if (checked) {
      setPlan(planDigest)
    }
  }

  return (
    <Radio
      size="xs"
      checked={plan === planDigest}
      onChange={(e) => handleCheckChange(e, planDigest)}
    />
  )
}
