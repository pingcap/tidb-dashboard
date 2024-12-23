import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { MetricsServiceGetTopMetricDataContext } from '../index.context';
import { metricsServiceGetTopMetricDataParams,
metricsServiceGetTopMetricDataQueryParams,
metricsServiceGetTopMetricDataResponse } from '../index.zod';

import metricsData from "../sample-res/metrics-data-cpu-usage.json"

const factory = createFactory()

export const metricsServiceGetTopMetricDataHandlers = factory.createHandlers(
  zValidator("param", metricsServiceGetTopMetricDataParams),
  zValidator("query", metricsServiceGetTopMetricDataQueryParams),
  zValidator("response", metricsServiceGetTopMetricDataResponse),
  async (c: MetricsServiceGetTopMetricDataContext) => {
    return c.json(metricsData)
  },
)
