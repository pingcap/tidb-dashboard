import { AppShell, ScrollArea, Stack } from "@tidbcloud/uikit"
import { Link } from "react-router-dom"

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell navbar={{ width: 200, breakpoint: 0 }}>
      <AppShell.Navbar p="xs" bg="carbon.2">
        <AppShell.Section>TiDB Dashboard Lib</AppShell.Section>
        <AppShell.Section grow component={ScrollArea}>
          <Stack mt={16}>
            <Link to="/metrics">Metrics</Link>
            <Link to="/metrics-azores-overview">Metrics Azores Overview</Link>
            <Link to="/metrics-azores-host">Metrics Azores Host</Link>
            <Link to="/slow-query/list">Slow Query</Link>
            <Link to="/statement/list">Statement</Link>
            <Link to="/index-advisor/list">Index Advisor</Link>
          </Stack>
        </AppShell.Section>
        <AppShell.Section>Theme / Language</AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  )
}
