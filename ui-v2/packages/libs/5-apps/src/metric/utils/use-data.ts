import { useQuery } from "@tanstack/react-query"

import { useAppContext } from "../ctx"

export function useMetricQueriesConfigData() {
  const ctx = useAppContext()

  return useQuery({
    queryKey: [ctx.ctxId, "metric", "queries-config"],
    queryFn: () => ctx.api.getMetricQueriesConfig(),
  })
}
