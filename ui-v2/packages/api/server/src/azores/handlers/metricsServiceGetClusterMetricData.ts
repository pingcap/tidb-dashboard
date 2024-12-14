import { createFactory } from "hono/factory"
import { zValidator } from "../index.validator"
import { MetricsServiceGetClusterMetricDataContext } from "../index.context"
import {
  metricsServiceGetClusterMetricDataParams,
  metricsServiceGetClusterMetricDataQueryParams,
  metricsServiceGetClusterMetricDataResponse,
} from "../index.zod"

import metricsData from "../sample-res/metrics-data-cpu-usage.json"

const factory = createFactory()

export const metricsServiceGetClusterMetricDataHandlers =
  factory.createHandlers(
    zValidator("param", metricsServiceGetClusterMetricDataParams),
    zValidator("query", metricsServiceGetClusterMetricDataQueryParams),
    zValidator("response", metricsServiceGetClusterMetricDataResponse),
    async (c: MetricsServiceGetClusterMetricDataContext) => {
      return c.json(metricsData)
    },
  )
