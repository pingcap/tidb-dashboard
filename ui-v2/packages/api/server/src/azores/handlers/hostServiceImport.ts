import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { HostServiceImportContext } from '../index.context';
import { hostServiceImportBody,
hostServiceImportResponse } from '../index.zod';

const factory = createFactory();


export const hostServiceImportHandlers = factory.createHandlers(
zValidator('json', hostServiceImportBody),
zValidator('response', hostServiceImportResponse),
async (c: HostServiceImportContext) => {

  },
);
