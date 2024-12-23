import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { ApiKeyServiceCreateApiKeyContext } from '../index.context';
import { apiKeyServiceCreateApiKeyBody,
apiKeyServiceCreateApiKeyResponse } from '../index.zod';

const factory = createFactory();


export const apiKeyServiceCreateApiKeyHandlers = factory.createHandlers(
zValidator('json', apiKeyServiceCreateApiKeyBody),
zValidator('response', apiKeyServiceCreateApiKeyResponse),
async (c: ApiKeyServiceCreateApiKeyContext) => {

  },
);
