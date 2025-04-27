import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { HostServiceImportTaskContext } from '../index.context';
import { hostServiceImportTaskParams,
hostServiceImportTaskResponse } from '../index.zod';

const factory = createFactory();


export const hostServiceImportTaskHandlers = factory.createHandlers(
zValidator('param', hostServiceImportTaskParams),
zValidator('response', hostServiceImportTaskResponse),
async (c: HostServiceImportTaskContext) => {

  },
);
