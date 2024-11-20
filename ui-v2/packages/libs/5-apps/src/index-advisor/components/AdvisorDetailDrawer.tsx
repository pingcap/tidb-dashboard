import {
  CodeBlock,
  LabelTooltip,
} from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import {
  IconArrowUpRight,
  IconChevronLeft,
  IconChevronRight,
  IconLinkExternal01,
} from "@pingcap-incubator/tidb-dashboard-lib-icons"
import {
  ActionIcon,
  Box,
  Button,
  Card,
  Divider,
  Drawer,
  Group,
  Skeleton,
  Stack,
  Typography,
} from "@pingcap-incubator/tidb-dashboard-lib-primitive-ui"
import { capitalize } from "lodash-es"
import { ReactNode, useMemo } from "react"

// import TimeComponent from 'dbaas/components/TimeComponent'

import { useIndexAdvisorUrlState } from "../url-state/list-url-state"
import { IndexAdvisorItem } from "../utils/type"
import { useAdvisorData } from "../utils/use-data"
import { formatReason } from "../utils/utils"

import AdvisorStatusIndicator from "./AdvisorStatusIndicator"
import { TopImpactedQueriesTable } from "./TopImpactedQueriesTable"

function Filed({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <Group wrap="nowrap" gap={48}>
      <Typography variant="label-lg" w={160} sx={{ flex: "none" }}>
        {label}
      </Typography>
      <Typography
        variant="body-lg"
        sx={{ overflowWrap: "break-word", width: 304 }}
      >
        {value}
      </Typography>
    </Group>
  )
}

function LoadingSkeleton() {
  return (
    <Stack gap="xl" px="xl">
      <Skeleton height={10} />
      <Skeleton height={10} />
      <Skeleton height={10} />
      <Skeleton height={10} />
    </Stack>
  )
}

function Statistic({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <Stack gap={8}>
      <Group gap={0}>
        <Typography variant="body-lg">{label}</Typography>
        {hint && <LabelTooltip label={hint} />}
      </Group>
      {children}
    </Stack>
  )
}

export function AdvisorDetailDrawer({
  advisors,
}: {
  advisors: IndexAdvisorItem[]
}) {
  const { advisorId, setAdvisorId, setApplyId } = useIndexAdvisorUrlState()
  const { data: advisor, isLoading } = useAdvisorData(advisorId)

  const curIdx = useMemo(() => {
    return advisors.findIndex((item) => item.id === advisorId)
  }, [advisorId, advisors])

  function preAdvisor() {
    setAdvisorId(advisors[curIdx - 1].id)
  }

  function nextAdvisor() {
    setAdvisorId(advisors[curIdx + 1].id)
  }

  return (
    <Drawer
      opened={!!advisorId}
      onClose={() => setAdvisorId()}
      position="right"
      size={560}
      overlayProps={{ opacity: 0.4 }}
      styles={() => ({
        drawer: {
          display: "flex",
          flexDirection: "column",
        },
        body: {
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          overflow: "hidden",
        },
        header: {
          padding: "16px 16px 16px 24px",
          marginBottom: 0,
        },
      })}
      title={<Typography variant="title-lg">Index advisor details</Typography>}
    >
      {isLoading ? (
        <LoadingSkeleton />
      ) : advisor ? (
        <>
          <Stack gap="xl" px="xl" style={{ overflowY: "auto" }}>
            <Filed label="Name" value={advisor.name} />
            <Filed label="Database" value={advisor.database} />
            <Filed label="Table" value={advisor.table} />
            {/* <Filed label="Last recommended" value={<TimeComponent time={advisor.last_recommend_time!} />} /> */}
            <Filed
              label="Last recommended"
              value={advisor.last_recommend_time}
            />
            <Filed
              label="Status"
              value={
                <AdvisorStatusIndicator
                  label={capitalize(advisor.state!)}
                  reason={advisor.state_reason!}
                />
              }
            />

            <Box>
              <Typography variant="title-md">Index statement</Typography>
              <CodeBlock language="sql" mt={16} mb={8}>
                {advisor.index_statement!}
              </CodeBlock>
              <Typography variant="body-sm" pl={16}>
                <Box
                  component="a"
                  target="_blank"
                  sx={{ display: "flex", alignItems: "center", gap: 4 }}
                >
                  Learn how to apply the index statement.
                  <IconLinkExternal01 strokeWidth={2} />
                </Box>
              </Typography>
            </Box>

            <Stack gap={16}>
              <Typography variant="title-md">Impacts</Typography>
              <Group grow>
                <Card>
                  <Statistic label="Estimated improvement" hint="">
                    <Group gap={4}>
                      <Typography variant="headline-sm">
                        {(advisor.improvement! * 100).toFixed(2)}
                      </Typography>
                      <Typography variant="title-md">%</Typography>
                      <IconArrowUpRight size={24} color="green" />
                    </Group>
                  </Statistic>
                </Card>
                <Card>
                  <Statistic label="Estimated index size" hint="">
                    <Group gap={4}>
                      <Typography variant="headline-sm">
                        {advisor.index_size}
                      </Typography>
                      <Typography variant="title-md">MiB</Typography>
                    </Group>
                  </Statistic>
                </Card>
              </Group>
              <Card>
                <Statistic label="Estimated cost saving" hint="">
                  <Group gap={4}>
                    <Typography variant="headline-sm">
                      ${(advisor.cost_saving_per_query! * 1000000).toFixed(2)}
                    </Typography>
                    <Typography variant="title-md">/ 1M queries or</Typography>
                    <Typography variant="headline-sm">
                      ${advisor.cost_saving_monthly!.toFixed(2)}
                    </Typography>
                    <Typography variant="title-md">/ month</Typography>
                  </Group>
                </Statistic>
              </Card>
            </Stack>

            <Stack gap={16}>
              <Typography variant="title-md">Top impacted queries</Typography>
              <TopImpactedQueriesTable
                impactedQueries={advisor.top_impacted_queries!}
              />
            </Stack>

            <Box>
              <Typography variant="title-md">Reason</Typography>
              <CodeBlock language="sql" mt={16} mb={8}>
                {formatReason(advisor.reason!)}
              </CodeBlock>
              <Typography variant="body-sm" pl={16}>
                <Box
                  component="a"
                  target="_blank"
                  sx={{ display: "flex", alignItems: "center", gap: 4 }}
                >
                  Learn how Index Advisor works.
                  <IconLinkExternal01 strokeWidth={2} />
                </Box>
              </Typography>
            </Box>
          </Stack>
          <Box>
            <Divider mt="xs" />
            <Group px="xl" py="xs" justify="left">
              <ActionIcon
                size={32}
                variant="default"
                disabled={curIdx <= 0}
                onClick={preAdvisor}
              >
                <IconChevronLeft size={16} strokeWidth={2} />
              </ActionIcon>
              <ActionIcon
                size={32}
                variant="default"
                disabled={curIdx >= advisors.length - 1}
                onClick={nextAdvisor}
              >
                <IconChevronRight size={16} strokeWidth={2} />
              </ActionIcon>
              {advisor.state === "OPEN" && (
                <Button ml="auto" h={32} onClick={() => setApplyId(advisor.id)}>
                  Apply index advisor
                </Button>
              )}
            </Group>
          </Box>
        </>
      ) : (
        <Stack gap="xl" px="xl">
          Something wrong happened.
        </Stack>
      )}
    </Drawer>
  )
}
