import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { HostServiceHostConfirmContext } from '../index.context';
import { hostServiceHostConfirmParams,
hostServiceHostConfirmBody,
hostServiceHostConfirmResponse } from '../index.zod';

const factory = createFactory();


export const hostServiceHostConfirmHandlers = factory.createHandlers(
zValidator('param', hostServiceHostConfirmParams),
zValidator('json', hostServiceHostConfirmBody),
zValidator('response', hostServiceHostConfirmResponse),
async (c: HostServiceHostConfirmContext) => {

  },
);
