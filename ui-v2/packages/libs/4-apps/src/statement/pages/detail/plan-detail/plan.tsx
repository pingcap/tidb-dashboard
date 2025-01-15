import { PlanTable } from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import { useTn } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { Card, Stack, Tabs, Title } from "@tidbcloud/uikit"
import { CodeBlock } from "@tidbcloud/uikit/biz"
import { useMemo } from "react"

export function Plan({ plan }: { plan: string }) {
  const { tt } = useTn("statement")

  const tabs = useMemo(() => {
    return [
      {
        label: tt("Table"),
        value: "table",
        component: <PlanTable plan={plan} />,
      },
      {
        label: tt("Text"),
        value: "text",
        component: (
          <CodeBlock
            codeRender={(content) => <pre>{content}</pre>}
            foldProps={{
              persistenceKey: "statement.detail.plan",
              iconVisible: true,
            }}
          >
            {plan}
          </CodeBlock>
        ),
      },
    ]
  }, [plan, tt])

  return (
    <Card shadow="xs" p="md">
      <Stack gap="xs">
        <Title order={5}>{tt("Execution Plan")}</Title>

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
