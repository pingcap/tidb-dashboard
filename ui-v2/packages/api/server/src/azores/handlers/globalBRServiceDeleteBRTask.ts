import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { GlobalBRServiceDeleteBRTaskContext } from '../index.context';
import { globalBRServiceDeleteBRTaskParams,
globalBRServiceDeleteBRTaskQueryParams,
globalBRServiceDeleteBRTaskResponse } from '../index.zod';

const factory = createFactory();


export const globalBRServiceDeleteBRTaskHandlers = factory.createHandlers(
zValidator('param', globalBRServiceDeleteBRTaskParams),
zValidator('query', globalBRServiceDeleteBRTaskQueryParams),
zValidator('response', globalBRServiceDeleteBRTaskResponse),
async (c: GlobalBRServiceDeleteBRTaskContext) => {

  },
);
