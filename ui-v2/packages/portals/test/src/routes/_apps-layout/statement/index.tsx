import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/_apps-layout/statement/")({
  beforeLoad: () => {
    throw redirect({ to: "/statement/list" })
  },
})
