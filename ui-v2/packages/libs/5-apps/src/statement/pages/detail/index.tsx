import { IconArrowLeft } from "@pingcap-incubator/tidb-dashboard-lib-icons"
import {
  Box,
  Button,
  Stack,
} from "@pingcap-incubator/tidb-dashboard-lib-primitive-ui"

import { useAppContext } from "../../ctx/context"

export function Detail() {
  const ctx = useAppContext()

  return (
    <Stack>
      <Box>
        <Button onClick={ctx.actions.backToList}>
          <IconArrowLeft size={16} strokeWidth={2} /> Back
        </Button>
      </Box>
    </Stack>
  )
}
