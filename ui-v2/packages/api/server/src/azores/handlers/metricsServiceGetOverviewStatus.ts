import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { MetricsServiceGetOverviewStatusContext } from '../index.context';
import { metricsServiceGetOverviewStatusQueryParams,
metricsServiceGetOverviewStatusResponse } from '../index.zod';

const factory = createFactory();


export const metricsServiceGetOverviewStatusHandlers = factory.createHandlers(
zValidator('query', metricsServiceGetOverviewStatusQueryParams),
zValidator('response', metricsServiceGetOverviewStatusResponse),
async (c: MetricsServiceGetOverviewStatusContext) => {

  },
);
