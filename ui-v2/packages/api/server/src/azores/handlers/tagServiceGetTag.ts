import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { TagServiceGetTagContext } from '../index.context';
import { tagServiceGetTagParams,
tagServiceGetTagResponse } from '../index.zod';

const factory = createFactory();


export const tagServiceGetTagHandlers = factory.createHandlers(
zValidator('param', tagServiceGetTagParams),
zValidator('response', tagServiceGetTagResponse),
async (c: TagServiceGetTagContext) => {

  },
);
