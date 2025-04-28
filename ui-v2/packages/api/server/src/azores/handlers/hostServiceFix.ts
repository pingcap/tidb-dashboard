import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { HostServiceFixContext } from '../index.context';
import { hostServiceFixParams,
hostServiceFixResponse } from '../index.zod';

const factory = createFactory();


export const hostServiceFixHandlers = factory.createHandlers(
zValidator('param', hostServiceFixParams),
zValidator('response', hostServiceFixResponse),
async (c: HostServiceFixContext) => {

  },
);
