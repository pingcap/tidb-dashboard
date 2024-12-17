import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { ClusterServiceDownloadSlowQueryListContext } from '../index.context';
import { clusterServiceDownloadSlowQueryListParams,
clusterServiceDownloadSlowQueryListQueryParams,
clusterServiceDownloadSlowQueryListResponse } from '../index.zod';

const factory = createFactory();


export const clusterServiceDownloadSlowQueryListHandlers = factory.createHandlers(
zValidator('param', clusterServiceDownloadSlowQueryListParams),
zValidator('query', clusterServiceDownloadSlowQueryListQueryParams),
zValidator('response', clusterServiceDownloadSlowQueryListResponse),
async (c: ClusterServiceDownloadSlowQueryListContext) => {

  },
);
