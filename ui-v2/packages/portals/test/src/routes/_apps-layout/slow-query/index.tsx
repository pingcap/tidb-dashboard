import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/_apps-layout/slow-query/")({
  beforeLoad: () => {
    throw redirect({ to: "/slow-query/list" })
  },
})
