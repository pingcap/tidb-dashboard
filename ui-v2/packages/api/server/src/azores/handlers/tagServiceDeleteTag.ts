import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { TagServiceDeleteTagContext } from '../index.context';
import { tagServiceDeleteTagParams,
tagServiceDeleteTagResponse } from '../index.zod';

const factory = createFactory();


export const tagServiceDeleteTagHandlers = factory.createHandlers(
zValidator('param', tagServiceDeleteTagParams),
zValidator('response', tagServiceDeleteTagResponse),
async (c: TagServiceDeleteTagContext) => {

  },
);
