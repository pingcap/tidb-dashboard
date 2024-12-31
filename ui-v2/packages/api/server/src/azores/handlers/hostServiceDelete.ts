import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { HostServiceDeleteContext } from '../index.context';
import { hostServiceDeleteParams,
hostServiceDeleteResponse } from '../index.zod';

const factory = createFactory();


export const hostServiceDeleteHandlers = factory.createHandlers(
zValidator('param', hostServiceDeleteParams),
zValidator('response', hostServiceDeleteResponse),
async (c: HostServiceDeleteContext) => {

  },
);
