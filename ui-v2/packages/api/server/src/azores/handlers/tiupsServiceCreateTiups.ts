import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { TiupsServiceCreateTiupsContext } from '../index.context';
import { tiupsServiceCreateTiupsBody,
tiupsServiceCreateTiupsResponse } from '../index.zod';

const factory = createFactory();


export const tiupsServiceCreateTiupsHandlers = factory.createHandlers(
zValidator('json', tiupsServiceCreateTiupsBody),
zValidator('response', tiupsServiceCreateTiupsResponse),
async (c: TiupsServiceCreateTiupsContext) => {

  },
);
