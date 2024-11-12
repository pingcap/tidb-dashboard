import {
  CodeBlock,
  PlanTable,
} from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import {
  Card,
  Stack,
  Tabs,
  Title,
} from "@pingcap-incubator/tidb-dashboard-lib-primitive-ui"
import { useMemo } from "react"

export function ExecutionPlan({ plan }: { plan: string }) {
  const tabs = useMemo(() => {
    return [
      {
        label: "Table",
        value: "table",
        component: <PlanTable plan={plan} />,
      },
      {
        label: "Text",
        value: "text",
        component: (
          <CodeBlock
            codeRender={(content) => <pre>{content}</pre>}
            foldProps={{
              persistenceKey: "statement.detail.execution-plan",
              iconVisible: true,
            }}
          >
            {plan}
          </CodeBlock>
        ),
      },
    ]
  }, [plan])

  return (
    <Card shadow="xs" p="xl">
      <Stack spacing="xs">
        <Title order={5}>Execution Plan</Title>

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
