import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { ClusterServiceGetSlowQueryAvailableAdvancedFiltersContext } from '../index.context';
import { clusterServiceGetSlowQueryAvailableAdvancedFiltersParams,
clusterServiceGetSlowQueryAvailableAdvancedFiltersResponse } from '../index.zod';

const factory = createFactory();


export const clusterServiceGetSlowQueryAvailableAdvancedFiltersHandlers = factory.createHandlers(
zValidator('param', clusterServiceGetSlowQueryAvailableAdvancedFiltersParams),
zValidator('response', clusterServiceGetSlowQueryAvailableAdvancedFiltersResponse),
async (c: ClusterServiceGetSlowQueryAvailableAdvancedFiltersContext) => {

  },
);
