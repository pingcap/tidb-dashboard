import { Link, Outlet, createFileRoute } from "@tanstack/react-router"
import { AppShell, NavLink, ScrollArea, Stack } from "@tidbcloud/uikit"
import { createStyles } from "@tidbcloud/uikit/utils"

import { TanStackRouterUrlStateProvider } from "../providers/url-state-provider"

export const Route = createFileRoute("/_apps-layout")({
  component: RouteComponent,
})

export const useStyles = createStyles(() => {
  return {
    navItems: {
      a: {
        textDecoration: "none",
      },
    },
  }
})

function RouteComponent() {
  const { classes } = useStyles()

  return (
    <AppShell navbar={{ width: 200, breakpoint: 0 }} padding="md">
      <AppShell.Navbar p="xs" bg="carbon.2">
        <AppShell.Section p={8}>TiDB Dashboard Lib</AppShell.Section>
        <AppShell.Section grow component={ScrollArea}>
          <Stack gap={8} className={classes.navItems}>
            <NavLink label="Metrics">
              <Stack gap={8}>
                <Link to="/metrics/normal">
                  {({ isActive }) => (
                    <NavLink active={isActive} label="Normal" />
                  )}
                </Link>
                <Link to="/metrics/azores-overview">
                  {({ isActive }) => (
                    <NavLink active={isActive} label="Azores Overview" />
                  )}
                </Link>
                <Link to="/metrics/azores-host">
                  {({ isActive }) => (
                    <NavLink active={isActive} label="Azores Host" />
                  )}
                </Link>
              </Stack>
            </NavLink>
            <Link to="/slow-query">
              {({ isActive }) => (
                <NavLink active={isActive} label="Slow Query" />
              )}
            </Link>
            <Link to="/statement">
              {({ isActive }) => (
                <NavLink active={isActive} label="Statement" />
              )}
            </Link>
          </Stack>
        </AppShell.Section>
        <AppShell.Section p={8}>Theme / Language</AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>
        <TanStackRouterUrlStateProvider>
          <Outlet />
        </TanStackRouterUrlStateProvider>
      </AppShell.Main>
    </AppShell>
  )
}
