import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { HostServiceGetHostContext } from '../index.context';
import { hostServiceGetHostParams,
hostServiceGetHostResponse } from '../index.zod';

const factory = createFactory();


export const hostServiceGetHostHandlers = factory.createHandlers(
zValidator('param', hostServiceGetHostParams),
zValidator('response', hostServiceGetHostResponse),
async (c: HostServiceGetHostContext) => {

  },
);
