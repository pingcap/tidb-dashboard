import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { LocationServiceGetLocationsContext } from '../index.context';
import { locationServiceGetLocationsParams,
locationServiceGetLocationsResponse } from '../index.zod';

const factory = createFactory();


export const locationServiceGetLocationsHandlers = factory.createHandlers(
zValidator('param', locationServiceGetLocationsParams),
zValidator('response', locationServiceGetLocationsResponse),
async (c: LocationServiceGetLocationsContext) => {

  },
);
