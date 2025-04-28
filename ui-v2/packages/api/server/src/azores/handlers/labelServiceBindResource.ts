import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { LabelServiceBindResourceContext } from '../index.context';
import { labelServiceBindResourceBody,
labelServiceBindResourceResponse } from '../index.zod';

const factory = createFactory();


export const labelServiceBindResourceHandlers = factory.createHandlers(
zValidator('json', labelServiceBindResourceBody),
zValidator('response', labelServiceBindResourceResponse),
async (c: LabelServiceBindResourceContext) => {

  },
);
