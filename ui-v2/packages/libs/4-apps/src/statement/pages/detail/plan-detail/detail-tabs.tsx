import { CustomJsonView } from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import { useTn } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import {
  ActionIcon,
  Card,
  CopyButton,
  Stack,
  Tabs,
  Title,
  Tooltip,
} from "@tidbcloud/uikit"
import { IconCheck, IconCopy02 } from "@tidbcloud/uikit/icons"
import { useMemo } from "react"

import { StatementModel } from "../../../models"

import { DetailBasic } from "./detail-basic"
import { DetailCopr } from "./detail-copr"
import { DetailTime } from "./detail-time"
import { DetailTxn } from "./detail-txn"

function DetailAll({ data }: { data: StatementModel }) {
  return (
    <Stack gap={0}>
      <CopyButton value={JSON.stringify(data, null, 2)} timeout={2000}>
        {({ copied, copy }) => (
          <Tooltip
            label={copied ? "Copied" : "Copy"}
            withArrow
            position="right"
          >
            <ActionIcon variant="subtle" onClick={copy}>
              {copied ? <IconCheck size={16} /> : <IconCopy02 size={16} />}
            </ActionIcon>
          </Tooltip>
        )}
      </CopyButton>
      <CustomJsonView data={data} />
    </Stack>
  )
}

export function DetailTabs({ data }: { data: StatementModel }) {
  const { tt } = useTn("statement")
  const tabs = useMemo(() => {
    const _tabs = [
      {
        label: tt("Basic"),
        value: "basic",
        component: <DetailBasic data={data} />,
      },
      {
        label: tt("Time"),
        value: "time",
        component: <DetailTime data={data} />,
      },
      {
        label: tt("Coprocessor Read"),
        value: "copr",
        component: <DetailCopr data={data} />,
      },
      {
        label: tt("Transaction"),
        value: "txn",
        component: <DetailTxn data={data} />,
      },
      {
        label: tt("All (Raw JSON)"),
        value: "all",
        component: <DetailAll data={data} />,
      },
    ]
    return _tabs
  }, [data, tt])

  return (
    <Card shadow="xs" p="md">
      <Stack gap="xs">
        <Title order={5}>{tt("Detail")}</Title>
        <Tabs defaultValue={tabs[0].value}>
          <Tabs.List mb="md">
            {tabs.map((tab) => (
              <Tabs.Tab key={tab.value} value={tab.value}>
                {tab.label}
              </Tabs.Tab>
            ))}
          </Tabs.List>
          {tabs.map((tab) => (
            <Tabs.Panel key={tab.value} value={tab.value}>
              {tab.component}
            </Tabs.Panel>
          ))}
        </Tabs>
      </Stack>
    </Card>
  )
}
