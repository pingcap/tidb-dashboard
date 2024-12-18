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

  },
);
