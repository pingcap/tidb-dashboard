import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { ClusterServiceGetTopSqlAvailableFieldsContext } from '../index.context';
import { clusterServiceGetTopSqlAvailableFieldsParams,
clusterServiceGetTopSqlAvailableFieldsResponse } from '../index.zod';

const factory = createFactory();


export const clusterServiceGetTopSqlAvailableFieldsHandlers = factory.createHandlers(
zValidator('param', clusterServiceGetTopSqlAvailableFieldsParams),
zValidator('response', clusterServiceGetTopSqlAvailableFieldsResponse),
async (c: ClusterServiceGetTopSqlAvailableFieldsContext) => {

  },
);
