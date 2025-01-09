import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { TagServiceBindResourceContext } from '../index.context';
import { tagServiceBindResourceBody,
tagServiceBindResourceResponse } from '../index.zod';

const factory = createFactory();


export const tagServiceBindResourceHandlers = factory.createHandlers(
zValidator('json', tagServiceBindResourceBody),
zValidator('response', tagServiceBindResourceResponse),
async (c: TagServiceBindResourceContext) => {

  },
);
