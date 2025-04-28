import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { TagServiceListTagsContext } from '../index.context';
import { tagServiceListTagsQueryParams,
tagServiceListTagsResponse } from '../index.zod';

const factory = createFactory();


export const tagServiceListTagsHandlers = factory.createHandlers(
zValidator('query', tagServiceListTagsQueryParams),
zValidator('response', tagServiceListTagsResponse),
async (c: TagServiceListTagsContext) => {

  },
);
