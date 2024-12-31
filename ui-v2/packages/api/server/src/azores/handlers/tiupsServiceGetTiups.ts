import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { TiupsServiceGetTiupsContext } from '../index.context';
import { tiupsServiceGetTiupsParams,
tiupsServiceGetTiupsResponse } from '../index.zod';

const factory = createFactory();


export const tiupsServiceGetTiupsHandlers = factory.createHandlers(
zValidator('param', tiupsServiceGetTiupsParams),
zValidator('response', tiupsServiceGetTiupsResponse),
async (c: TiupsServiceGetTiupsContext) => {

  },
);
