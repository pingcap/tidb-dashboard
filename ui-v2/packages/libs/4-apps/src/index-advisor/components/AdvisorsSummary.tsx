import { Alert, Typography } from "@tidbcloud/uikit"
import { IconCheckCircle } from "@tidbcloud/uikit/icons"

import { useAdvisorsSummaryData } from "../utils/use-data"

export function AdvisorsSummary() {
  const { data: summary } = useAdvisorsSummaryData()

  if (!summary || summary.open_count! <= 0) {
    return null
  }

  return (
    <Alert icon={<IconCheckCircle />} mx={24} mb={8} color="green">
      <Typography variant="body-lg" pr={8}>
        {summary.open_count} advisors open that you can apply to improve total
        estimated{" "}
        <Typography fw={600} span>
          {(summary.improvement! * 100).toFixed(2)}% in performance
        </Typography>
        , and save estimated{" "}
        <Typography fw={600} span>
          ${summary.cost_saving_monthly} in monthly cost
        </Typography>
        .
      </Typography>
    </Alert>
  )
}
