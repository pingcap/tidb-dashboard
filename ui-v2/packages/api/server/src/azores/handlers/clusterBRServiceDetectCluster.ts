import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { ClusterBRServiceDetectClusterContext } from '../index.context';
import { clusterBRServiceDetectClusterParams,
clusterBRServiceDetectClusterResponse } from '../index.zod';

const factory = createFactory();


export const clusterBRServiceDetectClusterHandlers = factory.createHandlers(
zValidator('param', clusterBRServiceDetectClusterParams),
zValidator('response', clusterBRServiceDetectClusterResponse),
async (c: ClusterBRServiceDetectClusterContext) => {

  },
);
