import { Tabs } from "@pingcap-incubator/tidb-dashboard-lib-primitive-ui"
import {
  Card,
  Stack,
  Title,
} from "@pingcap-incubator/tidb-dashboard-lib-primitive-ui"
import { useMemo } from "react"

import { SlowqueryModel } from "../../models"

import { DetailBasic } from "./detail-basic"
import { DetailCopr } from "./detail-copr"
import { DetailTime } from "./detail-time"
import { DetailTxn } from "./detail-txn"

export function DetailTabs({ data }: { data: SlowqueryModel }) {
  const tabs = useMemo(() => {
    return [
      {
        label: "Basic",
        value: "basic",
        component: <DetailBasic data={data} />,
      },
      { label: "Time", value: "time", component: <DetailTime data={data} /> },
      {
        label: "Coprocessor",
        value: "copr",
        component: <DetailCopr data={data} />,
      },
      {
        label: "Transaction",
        value: "txn",
        component: <DetailTxn data={data} />,
      },
    ]
  }, [data])

  return (
    <Card shadow="xs" p="xl">
      <Stack spacing="xs">
        <Title order={5}>Detail</Title>
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
