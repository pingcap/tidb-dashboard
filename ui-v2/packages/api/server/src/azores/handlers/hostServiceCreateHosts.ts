import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { HostServiceCreateHostsContext } from '../index.context';
import { hostServiceCreateHostsBody,
hostServiceCreateHostsResponse } from '../index.zod';

const factory = createFactory();


export const hostServiceCreateHostsHandlers = factory.createHandlers(
zValidator('json', hostServiceCreateHostsBody),
zValidator('response', hostServiceCreateHostsResponse),
async (c: HostServiceCreateHostsContext) => {

  },
);
