import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { ClusterServiceGetSlowQueryListContext } from '../index.context';
import { clusterServiceGetSlowQueryListParams,
clusterServiceGetSlowQueryListQueryParams,
clusterServiceGetSlowQueryListResponse } from '../index.zod';

import slowQueryListData from '../sample-res/slow-query-list.json'

const factory = createFactory();


export const clusterServiceGetSlowQueryListHandlers = factory.createHandlers(
// zValidator('param', clusterServiceGetSlowQueryListParams),
// zValidator('query', clusterServiceGetSlowQueryListQueryParams),
zValidator('response', clusterServiceGetSlowQueryListResponse),
async (c: ClusterServiceGetSlowQueryListContext) => {
    return c.json(slowQueryListData)
  },
);
