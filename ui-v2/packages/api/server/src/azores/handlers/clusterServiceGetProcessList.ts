import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { ClusterServiceGetProcessListContext } from '../index.context';
import { clusterServiceGetProcessListParams,
clusterServiceGetProcessListResponse } from '../index.zod';

const factory = createFactory();


export const clusterServiceGetProcessListHandlers = factory.createHandlers(
zValidator('param', clusterServiceGetProcessListParams),
zValidator('response', clusterServiceGetProcessListResponse),
async (c: ClusterServiceGetProcessListContext) => {

  },
);
