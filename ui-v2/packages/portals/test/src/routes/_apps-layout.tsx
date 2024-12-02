import { Outlet, createFileRoute } from "@tanstack/react-router"
import { AppShell, ScrollArea, Stack } from "@tidbcloud/uikit"

import { TanStackRouterUrlStateProvider } from "../providers/url-state-provider"

export const Route = createFileRoute("/_apps-layout")({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <AppShell navbar={{ width: 200, breakpoint: 0 }} padding="md">
      <AppShell.Navbar p="xs" bg="carbon.2">
        <AppShell.Section>TiDB Dashboard Lib</AppShell.Section>
        <AppShell.Section grow component={ScrollArea}>
          <Stack mt={16} gap={8}>
            links
          </Stack>
        </AppShell.Section>
        <AppShell.Section>Theme / Language</AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>
        <TanStackRouterUrlStateProvider>
          <Outlet />
        </TanStackRouterUrlStateProvider>
      </AppShell.Main>
    </AppShell>
  )
}
