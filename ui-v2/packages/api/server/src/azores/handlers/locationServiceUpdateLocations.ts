import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { LocationServiceUpdateLocationsContext } from '../index.context';
import { locationServiceUpdateLocationsParams,
locationServiceUpdateLocationsBody,
locationServiceUpdateLocationsResponse } from '../index.zod';

const factory = createFactory();


export const locationServiceUpdateLocationsHandlers = factory.createHandlers(
zValidator('param', locationServiceUpdateLocationsParams),
zValidator('json', locationServiceUpdateLocationsBody),
zValidator('response', locationServiceUpdateLocationsResponse),
async (c: LocationServiceUpdateLocationsContext) => {

  },
);
