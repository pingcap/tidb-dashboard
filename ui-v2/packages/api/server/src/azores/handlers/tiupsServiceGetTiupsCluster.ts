import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { TiupsServiceGetTiupsClusterContext } from '../index.context';
import { tiupsServiceGetTiupsClusterParams,
tiupsServiceGetTiupsClusterResponse } from '../index.zod';

const factory = createFactory();


export const tiupsServiceGetTiupsClusterHandlers = factory.createHandlers(
zValidator('param', tiupsServiceGetTiupsClusterParams),
zValidator('response', tiupsServiceGetTiupsClusterResponse),
async (c: TiupsServiceGetTiupsClusterContext) => {

  },
);
