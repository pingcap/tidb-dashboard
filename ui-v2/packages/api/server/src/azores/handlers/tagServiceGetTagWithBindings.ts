import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { TagServiceGetTagWithBindingsContext } from '../index.context';
import { tagServiceGetTagWithBindingsParams,
tagServiceGetTagWithBindingsResponse } from '../index.zod';

const factory = createFactory();


export const tagServiceGetTagWithBindingsHandlers = factory.createHandlers(
zValidator('param', tagServiceGetTagWithBindingsParams),
zValidator('response', tagServiceGetTagWithBindingsResponse),
async (c: TagServiceGetTagWithBindingsContext) => {

  },
);
