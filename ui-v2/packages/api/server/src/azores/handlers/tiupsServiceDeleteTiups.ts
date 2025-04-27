import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { TiupsServiceDeleteTiupsContext } from '../index.context';
import { tiupsServiceDeleteTiupsParams,
tiupsServiceDeleteTiupsResponse } from '../index.zod';

const factory = createFactory();


export const tiupsServiceDeleteTiupsHandlers = factory.createHandlers(
zValidator('param', tiupsServiceDeleteTiupsParams),
zValidator('response', tiupsServiceDeleteTiupsResponse),
async (c: TiupsServiceDeleteTiupsContext) => {

  },
);
