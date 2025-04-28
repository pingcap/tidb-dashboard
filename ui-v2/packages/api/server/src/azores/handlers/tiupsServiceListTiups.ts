import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { TiupsServiceListTiupsContext } from '../index.context';
import { tiupsServiceListTiupsQueryParams,
tiupsServiceListTiupsResponse } from '../index.zod';

const factory = createFactory();


export const tiupsServiceListTiupsHandlers = factory.createHandlers(
zValidator('query', tiupsServiceListTiupsQueryParams),
zValidator('response', tiupsServiceListTiupsResponse),
async (c: TiupsServiceListTiupsContext) => {

  },
);
