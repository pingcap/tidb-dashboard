import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { LocationServiceCreateLocationsContext } from '../index.context';
import { locationServiceCreateLocationsBody,
locationServiceCreateLocationsResponse } from '../index.zod';

const factory = createFactory();


export const locationServiceCreateLocationsHandlers = factory.createHandlers(
zValidator('json', locationServiceCreateLocationsBody),
zValidator('response', locationServiceCreateLocationsResponse),
async (c: LocationServiceCreateLocationsContext) => {

  },
);
