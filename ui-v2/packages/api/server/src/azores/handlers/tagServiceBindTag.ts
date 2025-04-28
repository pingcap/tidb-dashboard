import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { TagServiceBindTagContext } from '../index.context';
import { tagServiceBindTagBody,
tagServiceBindTagResponse } from '../index.zod';

const factory = createFactory();


export const tagServiceBindTagHandlers = factory.createHandlers(
zValidator('json', tagServiceBindTagBody),
zValidator('response', tagServiceBindTagResponse),
async (c: TagServiceBindTagContext) => {

  },
);
