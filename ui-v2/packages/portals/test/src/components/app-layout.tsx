import { AppShell, NavLink, ScrollArea, Stack } from "@tidbcloud/uikit"
import { Link, useLocation } from "react-router-dom"

function NavItem({ to, label }: { to: string; label: string }) {
  const { pathname } = useLocation()
  const isPathMatched = !!to && pathname.startsWith(to)
  return (
    <NavLink to={to} component={Link} label={label} active={isPathMatched} />
  )
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell navbar={{ width: 200, breakpoint: 0 }} padding="md">
      <AppShell.Navbar p="xs" bg="carbon.2">
        <AppShell.Section>TiDB Dashboard Lib</AppShell.Section>
        <AppShell.Section grow component={ScrollArea}>
          <Stack mt={16} gap={8}>
            <NavLink label="Metrics" childrenOffset={8}>
              <NavItem to="/metrics/normal" label="Normal" />
              <NavItem to="/metrics/azores-overview" label="Azores Overview" />
              <NavItem to="/metrics/azores-host" label="Azores Host" />
            </NavLink>
            <NavItem to="/slow-query/list" label="Slow Query" />
            <NavItem to="/statement/list" label="Statement" />
            <NavItem to="/index-advisor/list" label="Index Advisor" />
          </Stack>
        </AppShell.Section>
        <AppShell.Section>Theme / Language</AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  )
}
