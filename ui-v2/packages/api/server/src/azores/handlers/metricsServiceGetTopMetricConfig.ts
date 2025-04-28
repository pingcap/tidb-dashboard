import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { MetricsServiceGetTopMetricConfigContext } from '../index.context';
import { metricsServiceGetTopMetricConfigResponse } from '../index.zod';

const factory = createFactory();


export const metricsServiceGetTopMetricConfigHandlers = factory.createHandlers(
zValidator('response', metricsServiceGetTopMetricConfigResponse),
async (c: MetricsServiceGetTopMetricConfigContext) => {

  },
);
