import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { ClusterServiceUnbindSqlPlanContext } from '../index.context';
import { clusterServiceUnbindSqlPlanParams,
clusterServiceUnbindSqlPlanQueryParams,
clusterServiceUnbindSqlPlanResponse } from '../index.zod';

const factory = createFactory();


export const clusterServiceUnbindSqlPlanHandlers = factory.createHandlers(
zValidator('param', clusterServiceUnbindSqlPlanParams),
zValidator('query', clusterServiceUnbindSqlPlanQueryParams),
zValidator('response', clusterServiceUnbindSqlPlanResponse),
async (c: ClusterServiceUnbindSqlPlanContext) => {

  },
);
