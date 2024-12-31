import { CustomJsonView } from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import { Card, Stack, Tabs, Title } from "@tidbcloud/uikit"
import { useMemo } from "react"

import { SlowqueryModel } from "../../models"

import { DetailBasic } from "./detail-basic"
import { DetailCopr } from "./detail-copr"
import { DetailTime } from "./detail-time"
import { DetailTxn } from "./detail-txn"

export function DetailTabs({ data }: { data: SlowqueryModel }) {
  const tabs = useMemo(() => {
    const _tabs = [
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
    if (data.warnings) {
      let jsonData = {}
      if (typeof data.warnings === "string") {
        jsonData = JSON.parse(data.warnings)
      } else if (typeof data.warnings === "object") {
        jsonData = data.warnings
      }
      _tabs.push({
        label: "Warnings",
        value: "warnings",
        component: <CustomJsonView data={jsonData} />,
      })
    }
    // all
    _tabs.push({
      label: "All (Raw JSON)",
      value: "all",
      component: <CustomJsonView data={data} />,
    })

    return _tabs
  }, [data])

  return (
    <Card shadow="xs" p="md">
      <Stack gap="xs">
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
