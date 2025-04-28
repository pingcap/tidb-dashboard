import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { TagServiceUpdateTagContext } from '../index.context';
import { tagServiceUpdateTagParams,
tagServiceUpdateTagBody,
tagServiceUpdateTagResponse } from '../index.zod';

const factory = createFactory();


export const tagServiceUpdateTagHandlers = factory.createHandlers(
zValidator('param', tagServiceUpdateTagParams),
zValidator('json', tagServiceUpdateTagBody),
zValidator('response', tagServiceUpdateTagResponse),
async (c: TagServiceUpdateTagContext) => {

  },
);
