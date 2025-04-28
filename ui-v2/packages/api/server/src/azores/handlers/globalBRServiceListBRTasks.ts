import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { GlobalBRServiceListBRTasksContext } from '../index.context';
import { globalBRServiceListBRTasksQueryParams,
globalBRServiceListBRTasksResponse } from '../index.zod';

const factory = createFactory();


export const globalBRServiceListBRTasksHandlers = factory.createHandlers(
zValidator('query', globalBRServiceListBRTasksQueryParams),
zValidator('response', globalBRServiceListBRTasksResponse),
async (c: GlobalBRServiceListBRTasksContext) => {

  },
);
