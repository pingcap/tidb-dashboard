import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { HostServiceCheckContext } from '../index.context';
import { hostServiceCheckParams,
hostServiceCheckResponse } from '../index.zod';

const factory = createFactory();


export const hostServiceCheckHandlers = factory.createHandlers(
zValidator('param', hostServiceCheckParams),
zValidator('response', hostServiceCheckResponse),
async (c: HostServiceCheckContext) => {

  },
);
