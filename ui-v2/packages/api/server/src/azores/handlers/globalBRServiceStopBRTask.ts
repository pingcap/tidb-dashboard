import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { GlobalBRServiceStopBRTaskContext } from '../index.context';
import { globalBRServiceStopBRTaskParams,
globalBRServiceStopBRTaskResponse } from '../index.zod';

const factory = createFactory();


export const globalBRServiceStopBRTaskHandlers = factory.createHandlers(
zValidator('param', globalBRServiceStopBRTaskParams),
zValidator('response', globalBRServiceStopBRTaskResponse),
async (c: GlobalBRServiceStopBRTaskContext) => {

  },
);
