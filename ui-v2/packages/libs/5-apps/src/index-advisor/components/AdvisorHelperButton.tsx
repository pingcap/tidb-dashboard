import { IconArrowUpRight } from "@pingcap-incubator/tidb-dashboard-lib-icons"
import { Button } from "@pingcap-incubator/tidb-dashboard-lib-primitive-ui"

import { useIndexAdvisorUrlState } from "../url-state/list-url-state"

export function AdvisorHelperButton() {
  const { showHelper } = useIndexAdvisorUrlState()
  return (
    <Button
      ml="auto"
      h={32}
      variant="default"
      onClick={() => showHelper()}
      leftSection={<IconArrowUpRight strokeWidth={2} />}
    >
      Index advisor helper
    </Button>
  )
}
