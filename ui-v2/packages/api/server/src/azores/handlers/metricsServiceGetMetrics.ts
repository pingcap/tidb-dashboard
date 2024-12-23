import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { MetricsServiceGetMetricsContext } from '../index.context';
import { metricsServiceGetMetricsQueryParams,
metricsServiceGetMetricsResponse } from '../index.zod';

import metricsConfigOverview from "../sample-res/metrics-config-overview.json"
import metricsConfigHost from "../sample-res/metrics-config-host.json"
import metricsConfigCluster from "../sample-res/metrics-config-cluster.json"
import metricsConfigClusterOverview from "../sample-res/metrics-config-cluster-overview.json"

const factory = createFactory()

export const metricsServiceGetMetricsHandlers = factory.createHandlers(
  zValidator("query", metricsServiceGetMetricsQueryParams),
  zValidator("response", metricsServiceGetMetricsResponse),
  async (c: MetricsServiceGetMetricsContext) => {
    const classType = c.req.query("class")
    const group = c.req.query("group")

    if (classType === "overview") {
      return c.json(metricsConfigOverview)
    } else if (classType === "host") {
      return c.json(metricsConfigHost)
    } else if (classType === "cluster") {
      if (group === "overview") {
        return c.json(metricsConfigClusterOverview)
      } else {
        return c.json(metricsConfigCluster)
      }
    }
  },
)
