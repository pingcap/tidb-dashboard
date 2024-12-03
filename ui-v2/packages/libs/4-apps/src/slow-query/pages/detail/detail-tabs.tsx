import {
  Card,
  Stack,
  Tabs,
  Title,
  useComputedColorScheme,
} from "@pingcap-incubator/tidb-dashboard-lib-primitive-ui"
import { createStyles } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { useMemo } from "react"
import {
  JsonView,
  Props as JsonViewProps,
  allExpanded,
  darkStyles,
  defaultStyles,
} from "react-json-view-lite"

import { SlowqueryModel } from "../../models"

import { DetailBasic } from "./detail-basic"
import { DetailCopr } from "./detail-copr"
import { DetailTime } from "./detail-time"
import { DetailTxn } from "./detail-txn"

import "react-json-view-lite/dist/index.css"

const useStyles = createStyles(() => ({
  container: {
    paddingTop: 8,
    paddingBottom: 8,
    background: "transparent",
    lineHeight: 1.2,
    whiteSpace: "pre-wrap",
    wordWrap: "break-word",
  },
  basicChildStyle: {
    margin: 0,
    padding: 0,
  },
}))

function WarningsJsonView({ data }: JsonViewProps) {
  const colorScheme = useComputedColorScheme()
  const { classes } = useStyles()
  const style = useMemo(() => {
    const _style = colorScheme === "dark" ? darkStyles : defaultStyles
    return {
      ..._style,
      container: classes.container,
      basicChildStyle: classes.basicChildStyle,
    }
  }, [colorScheme])

  return <JsonView data={data} shouldExpandNode={allExpanded} style={style} />
}

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
      _tabs.push({
        label: "Warnings",
        value: "warnings",
        component: <WarningsJsonView data={data.warnings} />,
      })
    }
    return _tabs
  }, [data])

  return (
    <Card shadow="xs" p="xl">
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
