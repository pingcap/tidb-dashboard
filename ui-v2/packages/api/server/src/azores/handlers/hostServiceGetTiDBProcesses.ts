import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { HostServiceGetTiDBProcessesContext } from '../index.context';
import { hostServiceGetTiDBProcessesParams,
hostServiceGetTiDBProcessesResponse } from '../index.zod';

const factory = createFactory();


export const hostServiceGetTiDBProcessesHandlers = factory.createHandlers(
zValidator('param', hostServiceGetTiDBProcessesParams),
zValidator('response', hostServiceGetTiDBProcessesResponse),
async (c: HostServiceGetTiDBProcessesContext) => {

  },
);
