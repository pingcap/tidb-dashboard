import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { ClusterBRServiceListClusterBRTasksContext } from '../index.context';
import { clusterBRServiceListClusterBRTasksParams,
clusterBRServiceListClusterBRTasksQueryParams,
clusterBRServiceListClusterBRTasksResponse } from '../index.zod';

const factory = createFactory();


export const clusterBRServiceListClusterBRTasksHandlers = factory.createHandlers(
zValidator('param', clusterBRServiceListClusterBRTasksParams),
zValidator('query', clusterBRServiceListClusterBRTasksQueryParams),
zValidator('response', clusterBRServiceListClusterBRTasksResponse),
async (c: ClusterBRServiceListClusterBRTasksContext) => {

  },
);
