import { createFactory } from "hono/factory"
import { zValidator } from "../index.validator"
import { MetricsServiceGetHostMetricDataContext } from "../index.context"
import {
  metricsServiceGetHostMetricDataParams,
  metricsServiceGetHostMetricDataQueryParams,
  metricsServiceGetHostMetricDataResponse,
} from "../index.zod"

const factory = createFactory()

export const metricsServiceGetHostMetricDataHandlers = factory.createHandlers(
  zValidator("param", metricsServiceGetHostMetricDataParams),
  zValidator("query", metricsServiceGetHostMetricDataQueryParams),
  zValidator("response", metricsServiceGetHostMetricDataResponse),
  async (c: MetricsServiceGetHostMetricDataContext) => {},
)
