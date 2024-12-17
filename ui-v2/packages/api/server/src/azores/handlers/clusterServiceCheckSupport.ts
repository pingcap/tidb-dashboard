import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { ClusterServiceCheckSupportContext } from '../index.context';
import { clusterServiceCheckSupportParams,
clusterServiceCheckSupportResponse } from '../index.zod';

const factory = createFactory();


export const clusterServiceCheckSupportHandlers = factory.createHandlers(
zValidator('param', clusterServiceCheckSupportParams),
zValidator('response', clusterServiceCheckSupportResponse),
async (c: ClusterServiceCheckSupportContext) => {

  },
);
