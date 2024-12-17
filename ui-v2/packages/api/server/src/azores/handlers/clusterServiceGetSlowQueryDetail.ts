import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { ClusterServiceGetSlowQueryDetailContext } from '../index.context';
import { clusterServiceGetSlowQueryDetailParams,
clusterServiceGetSlowQueryDetailQueryParams,
clusterServiceGetSlowQueryDetailResponse } from '../index.zod';

const factory = createFactory();


export const clusterServiceGetSlowQueryDetailHandlers = factory.createHandlers(
zValidator('param', clusterServiceGetSlowQueryDetailParams),
zValidator('query', clusterServiceGetSlowQueryDetailQueryParams),
zValidator('response', clusterServiceGetSlowQueryDetailResponse),
async (c: ClusterServiceGetSlowQueryDetailContext) => {

  },
);
