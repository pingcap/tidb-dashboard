import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { LocationServiceDeleteLocationContext } from '../index.context';
import { locationServiceDeleteLocationParams,
locationServiceDeleteLocationResponse } from '../index.zod';

const factory = createFactory();


export const locationServiceDeleteLocationHandlers = factory.createHandlers(
zValidator('param', locationServiceDeleteLocationParams),
zValidator('response', locationServiceDeleteLocationResponse),
async (c: LocationServiceDeleteLocationContext) => {

  },
);
