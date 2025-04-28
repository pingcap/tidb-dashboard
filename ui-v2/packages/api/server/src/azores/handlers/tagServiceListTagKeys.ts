import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { TagServiceListTagKeysContext } from '../index.context';
import { tagServiceListTagKeysQueryParams,
tagServiceListTagKeysResponse } from '../index.zod';

const factory = createFactory();


export const tagServiceListTagKeysHandlers = factory.createHandlers(
zValidator('query', tagServiceListTagKeysQueryParams),
zValidator('response', tagServiceListTagKeysResponse),
async (c: TagServiceListTagKeysContext) => {

  },
);
