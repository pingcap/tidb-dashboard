import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/_apps-layout/metrics/")({
  beforeLoad: () => {
    throw redirect({ to: "/metrics/normal" })
  },
})
