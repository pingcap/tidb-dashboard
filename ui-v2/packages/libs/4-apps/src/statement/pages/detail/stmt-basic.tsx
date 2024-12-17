import { formatTime } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { Box, Card, SimpleGrid, Typography } from "@tidbcloud/uikit"

import { StatementModel } from "../../models"

type StmtBasicProps = {
  stmt: StatementModel
  plansCount: number
}

export function StmtBasic({ stmt, plansCount }: StmtBasicProps) {
  return (
    <Card shadow="xs" p="md">
      <SimpleGrid cols={2} spacing="xs">
        <Box>
          <Typography variant="body-lg" c="carbon.7">
            Query Template ID
          </Typography>
          <Typography style={{ wordBreak: "break-all" }}>
            {stmt.digest ?? ""}
          </Typography>
        </Box>
        <Box>
          <Typography variant="body-lg" c="carbon.7">
            Time Range
          </Typography>
          <Typography>
            {formatTime(stmt.summary_begin_time! * 1000)} ~{" "}
            {formatTime(stmt.summary_end_time! * 1000)}
          </Typography>
        </Box>
        <Box>
          <Typography variant="body-lg" c="carbon.7">
            Plans Count
          </Typography>
          <Typography>{plansCount}</Typography>
        </Box>
        <Box>
          <Typography variant="body-lg" c="carbon.7">
            Execution Database
          </Typography>
          <Typography>{stmt.schema_name ?? ""}</Typography>
        </Box>
      </SimpleGrid>
    </Card>
  )
}
