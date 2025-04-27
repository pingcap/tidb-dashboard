import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { TagServiceCreateTagContext } from '../index.context';
import { tagServiceCreateTagBody,
tagServiceCreateTagResponse } from '../index.zod';

const factory = createFactory();


export const tagServiceCreateTagHandlers = factory.createHandlers(
zValidator('json', tagServiceCreateTagBody),
zValidator('response', tagServiceCreateTagResponse),
async (c: TagServiceCreateTagContext) => {

  },
);
