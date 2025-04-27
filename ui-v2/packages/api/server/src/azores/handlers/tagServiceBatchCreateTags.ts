import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { TagServiceBatchCreateTagsContext } from '../index.context';
import { tagServiceBatchCreateTagsBody,
tagServiceBatchCreateTagsResponse } from '../index.zod';

const factory = createFactory();


export const tagServiceBatchCreateTagsHandlers = factory.createHandlers(
zValidator('json', tagServiceBatchCreateTagsBody),
zValidator('response', tagServiceBatchCreateTagsResponse),
async (c: TagServiceBatchCreateTagsContext) => {

  },
);
