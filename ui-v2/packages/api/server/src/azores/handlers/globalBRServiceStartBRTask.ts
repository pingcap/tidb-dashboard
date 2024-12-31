import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { GlobalBRServiceStartBRTaskContext } from '../index.context';
import { globalBRServiceStartBRTaskParams,
globalBRServiceStartBRTaskResponse } from '../index.zod';

const factory = createFactory();


export const globalBRServiceStartBRTaskHandlers = factory.createHandlers(
zValidator('param', globalBRServiceStartBRTaskParams),
zValidator('response', globalBRServiceStartBRTaskResponse),
async (c: GlobalBRServiceStartBRTaskContext) => {

  },
);
