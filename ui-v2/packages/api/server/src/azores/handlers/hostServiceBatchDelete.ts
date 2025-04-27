import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { HostServiceBatchDeleteContext } from '../index.context';
import { hostServiceBatchDeleteBody,
hostServiceBatchDeleteResponse } from '../index.zod';

const factory = createFactory();


export const hostServiceBatchDeleteHandlers = factory.createHandlers(
zValidator('json', hostServiceBatchDeleteBody),
zValidator('response', hostServiceBatchDeleteResponse),
async (c: HostServiceBatchDeleteContext) => {

  },
);
