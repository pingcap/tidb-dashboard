import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { TagServiceListTagsWithBindingsContext } from '../index.context';
import { tagServiceListTagsWithBindingsQueryParams,
tagServiceListTagsWithBindingsResponse } from '../index.zod';

const factory = createFactory();


export const tagServiceListTagsWithBindingsHandlers = factory.createHandlers(
zValidator('query', tagServiceListTagsWithBindingsQueryParams),
zValidator('response', tagServiceListTagsWithBindingsResponse),
async (c: TagServiceListTagsWithBindingsContext) => {

  },
);
