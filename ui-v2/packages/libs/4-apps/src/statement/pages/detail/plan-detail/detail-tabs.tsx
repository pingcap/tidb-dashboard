import { CustomJsonView } from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import { useTn } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { Card, Stack, Tabs, Title } from "@tidbcloud/uikit"
import { useMemo } from "react"

import { StatementModel } from "../../../models"

import { DetailBasic } from "./detail-basic"
import { DetailCopr } from "./detail-copr"
import { DetailTime } from "./detail-time"
import { DetailTxn } from "./detail-txn"

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
        component: <CustomJsonView data={data} />,
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
