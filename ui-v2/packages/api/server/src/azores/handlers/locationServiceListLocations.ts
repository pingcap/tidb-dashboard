import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { LocationServiceListLocationsContext } from '../index.context';
import { locationServiceListLocationsQueryParams,
locationServiceListLocationsResponse } from '../index.zod';

const factory = createFactory();


export const locationServiceListLocationsHandlers = factory.createHandlers(
zValidator('query', locationServiceListLocationsQueryParams),
zValidator('response', locationServiceListLocationsResponse),
async (c: LocationServiceListLocationsContext) => {

  },
);
