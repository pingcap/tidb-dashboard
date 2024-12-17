import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { ClusterServiceBindSqlPlanContext } from '../index.context';
import { clusterServiceBindSqlPlanParams,
clusterServiceBindSqlPlanResponse } from '../index.zod';

const factory = createFactory();


export const clusterServiceBindSqlPlanHandlers = factory.createHandlers(
zValidator('param', clusterServiceBindSqlPlanParams),
zValidator('response', clusterServiceBindSqlPlanResponse),
async (c: ClusterServiceBindSqlPlanContext) => {

  },
);
