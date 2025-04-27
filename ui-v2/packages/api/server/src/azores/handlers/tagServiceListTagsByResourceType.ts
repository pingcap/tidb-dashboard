import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { TagServiceListTagsByResourceTypeContext } from '../index.context';
import { tagServiceListTagsByResourceTypeQueryParams,
tagServiceListTagsByResourceTypeResponse } from '../index.zod';

const factory = createFactory();


export const tagServiceListTagsByResourceTypeHandlers = factory.createHandlers(
zValidator('query', tagServiceListTagsByResourceTypeQueryParams),
zValidator('response', tagServiceListTagsByResourceTypeResponse),
async (c: TagServiceListTagsByResourceTypeContext) => {

  },
);
