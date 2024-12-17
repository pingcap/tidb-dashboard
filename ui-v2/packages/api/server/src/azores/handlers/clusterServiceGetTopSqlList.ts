import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { ClusterServiceGetTopSqlListContext } from '../index.context';
import { clusterServiceGetTopSqlListParams,
clusterServiceGetTopSqlListQueryParams,
clusterServiceGetTopSqlListResponse } from '../index.zod';

const factory = createFactory();


export const clusterServiceGetTopSqlListHandlers = factory.createHandlers(
zValidator('param', clusterServiceGetTopSqlListParams),
zValidator('query', clusterServiceGetTopSqlListQueryParams),
zValidator('response', clusterServiceGetTopSqlListResponse),
async (c: ClusterServiceGetTopSqlListContext) => {

  },
);
