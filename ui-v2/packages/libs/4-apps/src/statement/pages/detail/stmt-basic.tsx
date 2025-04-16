import { formatTime, useTn } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { Box, Card, SimpleGrid, Typography } from "@tidbcloud/uikit"

import { StatementModel } from "../../models"

export function StmtBasic({ stmt }: { stmt: StatementModel }) {
  const { tt } = useTn("statement")
  return (
    <Card shadow="xs" p="md">
      <SimpleGrid cols={2} spacing="xs">
        <Box>
          <Typography variant="body-lg" c="carbon.7">
            {tt("Query Template ID")}
          </Typography>
          <Typography style={{ wordBreak: "break-all" }}>
            {stmt.digest ?? ""}
          </Typography>
        </Box>
        <Box>
          <Typography variant="body-lg" c="carbon.7">
            {tt("Time Range")}
          </Typography>
          <Typography>
            {formatTime(stmt.summary_begin_time! * 1000)} ~{" "}
            {formatTime(stmt.summary_end_time! * 1000)}
          </Typography>
        </Box>
        <Box>
          <Typography variant="body-lg" c="carbon.7">
            {tt("Plans Count")}
          </Typography>
          <Typography>{stmt.plan_count!}</Typography>
        </Box>
        <Box>
          <Typography variant="body-lg" c="carbon.7">
            {tt("Execution Database")}
          </Typography>
          <Typography>{stmt.schema_name || "-"}</Typography>
        </Box>
      </SimpleGrid>
    </Card>
  )
}
