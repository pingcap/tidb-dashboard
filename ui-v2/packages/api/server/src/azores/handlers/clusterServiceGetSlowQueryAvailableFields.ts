import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { ClusterServiceGetSlowQueryAvailableFieldsContext } from '../index.context';
import { clusterServiceGetSlowQueryAvailableFieldsParams,
clusterServiceGetSlowQueryAvailableFieldsResponse } from '../index.zod';

const factory = createFactory();


export const clusterServiceGetSlowQueryAvailableFieldsHandlers = factory.createHandlers(
zValidator('param', clusterServiceGetSlowQueryAvailableFieldsParams),
zValidator('response', clusterServiceGetSlowQueryAvailableFieldsResponse),
async (c: ClusterServiceGetSlowQueryAvailableFieldsContext) => {

  },
);
