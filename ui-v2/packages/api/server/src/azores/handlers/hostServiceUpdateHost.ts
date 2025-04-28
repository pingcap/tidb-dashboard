import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { HostServiceUpdateHostContext } from '../index.context';
import { hostServiceUpdateHostParams,
hostServiceUpdateHostBody,
hostServiceUpdateHostResponse } from '../index.zod';

const factory = createFactory();


export const hostServiceUpdateHostHandlers = factory.createHandlers(
zValidator('param', hostServiceUpdateHostParams),
zValidator('json', hostServiceUpdateHostBody),
zValidator('response', hostServiceUpdateHostResponse),
async (c: HostServiceUpdateHostContext) => {

  },
);
