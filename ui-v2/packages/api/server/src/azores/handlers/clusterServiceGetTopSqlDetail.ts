import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { ClusterServiceGetTopSqlDetailContext } from '../index.context';
import { clusterServiceGetTopSqlDetailParams,
clusterServiceGetTopSqlDetailQueryParams,
clusterServiceGetTopSqlDetailResponse } from '../index.zod';

const factory = createFactory();


export const clusterServiceGetTopSqlDetailHandlers = factory.createHandlers(
zValidator('param', clusterServiceGetTopSqlDetailParams),
zValidator('query', clusterServiceGetTopSqlDetailQueryParams),
zValidator('response', clusterServiceGetTopSqlDetailResponse),
async (c: ClusterServiceGetTopSqlDetailContext) => {

  },
);
