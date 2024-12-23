import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { MetricsServiceGetClusterMetricInstanceContext } from '../index.context';
import { metricsServiceGetClusterMetricInstanceParams,
metricsServiceGetClusterMetricInstanceResponse } from '../index.zod';

const factory = createFactory();


export const metricsServiceGetClusterMetricInstanceHandlers = factory.createHandlers(
zValidator('param', metricsServiceGetClusterMetricInstanceParams),
zValidator('response', metricsServiceGetClusterMetricInstanceResponse),
async (c: MetricsServiceGetClusterMetricInstanceContext) => {
    return c.json({
      type: "tidb",
      instanceList: ["10.2.12.107:10081", "10.2.12.107:10082"],
    })
  },
);
