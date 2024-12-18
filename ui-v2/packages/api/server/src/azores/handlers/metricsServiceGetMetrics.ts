import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { MetricsServiceGetMetricsContext } from '../index.context';
import { metricsServiceGetMetricsQueryParams,
metricsServiceGetMetricsResponse } from '../index.zod';

const factory = createFactory();


export const metricsServiceGetMetricsHandlers = factory.createHandlers(
zValidator('query', metricsServiceGetMetricsQueryParams),
zValidator('response', metricsServiceGetMetricsResponse),
async (c: MetricsServiceGetMetricsContext) => {

  },
);
