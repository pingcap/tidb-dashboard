import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { ClusterServiceGetSqlPlanListContext } from '../index.context';
import { clusterServiceGetSqlPlanListParams,
clusterServiceGetSqlPlanListQueryParams,
clusterServiceGetSqlPlanListResponse } from '../index.zod';

const factory = createFactory();


export const clusterServiceGetSqlPlanListHandlers = factory.createHandlers(
zValidator('param', clusterServiceGetSqlPlanListParams),
zValidator('query', clusterServiceGetSqlPlanListQueryParams),
zValidator('response', clusterServiceGetSqlPlanListResponse),
async (c: ClusterServiceGetSqlPlanListContext) => {

  },
);
