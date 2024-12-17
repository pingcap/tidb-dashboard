import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { ClusterServiceGetSqlPlanBindingListContext } from '../index.context';
import { clusterServiceGetSqlPlanBindingListParams,
clusterServiceGetSqlPlanBindingListQueryParams,
clusterServiceGetSqlPlanBindingListResponse } from '../index.zod';

const factory = createFactory();


export const clusterServiceGetSqlPlanBindingListHandlers = factory.createHandlers(
zValidator('param', clusterServiceGetSqlPlanBindingListParams),
zValidator('query', clusterServiceGetSqlPlanBindingListQueryParams),
zValidator('response', clusterServiceGetSqlPlanBindingListResponse),
async (c: ClusterServiceGetSqlPlanBindingListContext) => {

  },
);
