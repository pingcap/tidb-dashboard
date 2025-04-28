import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { ApiKeyServiceGetTemErrorDetailContext } from '../index.context';
import { apiKeyServiceGetTemErrorDetailResponse } from '../index.zod';

const factory = createFactory();


export const apiKeyServiceGetTemErrorDetailHandlers = factory.createHandlers(
zValidator('response', apiKeyServiceGetTemErrorDetailResponse),
async (c: ApiKeyServiceGetTemErrorDetailContext) => {

  },
);
