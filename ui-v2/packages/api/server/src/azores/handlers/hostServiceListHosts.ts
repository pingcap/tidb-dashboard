import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { HostServiceListHostsContext } from '../index.context';
import { hostServiceListHostsQueryParams,
hostServiceListHostsResponse } from '../index.zod';

const factory = createFactory();


export const hostServiceListHostsHandlers = factory.createHandlers(
zValidator('query', hostServiceListHostsQueryParams),
zValidator('response', hostServiceListHostsResponse),
async (c: HostServiceListHostsContext) => {

  },
);
