import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { HostServiceGetDisksContext } from '../index.context';
import { hostServiceGetDisksParams,
hostServiceGetDisksResponse } from '../index.zod';

const factory = createFactory();


export const hostServiceGetDisksHandlers = factory.createHandlers(
zValidator('param', hostServiceGetDisksParams),
zValidator('response', hostServiceGetDisksResponse),
async (c: HostServiceGetDisksContext) => {

  },
);
