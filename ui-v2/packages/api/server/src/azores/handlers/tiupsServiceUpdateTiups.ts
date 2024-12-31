import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { TiupsServiceUpdateTiupsContext } from '../index.context';
import { tiupsServiceUpdateTiupsParams,
tiupsServiceUpdateTiupsBody,
tiupsServiceUpdateTiupsResponse } from '../index.zod';

const factory = createFactory();


export const tiupsServiceUpdateTiupsHandlers = factory.createHandlers(
zValidator('param', tiupsServiceUpdateTiupsParams),
zValidator('json', tiupsServiceUpdateTiupsBody),
zValidator('response', tiupsServiceUpdateTiupsResponse),
async (c: TiupsServiceUpdateTiupsContext) => {

  },
);
