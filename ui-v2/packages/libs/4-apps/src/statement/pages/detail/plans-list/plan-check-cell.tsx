import { Checkbox } from "@tidbcloud/uikit"

import { useDetailUrlState } from "../../../url-state/detail-url-state"

export function PlanCheckCell({ planDigest }: { planDigest: string }) {
  const { plans, setPlans } = useDetailUrlState()

  const handleCheckChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    planDigest: string,
  ) => {
    const checked = e.target.checked
    if (checked) {
      const newPlans = plans.filter((d) => d !== "empty").concat(planDigest)
      setPlans(newPlans)
    } else {
      const newPlans = plans.filter((d) => d !== planDigest)
      if (newPlans.length === 0) {
        newPlans.push("empty")
      }
      setPlans(newPlans)
    }
  }

  return (
    <Checkbox
      size="xs"
      checked={plans.includes(planDigest)}
      onChange={(e) => handleCheckChange(e, planDigest)}
    />
  )
}
