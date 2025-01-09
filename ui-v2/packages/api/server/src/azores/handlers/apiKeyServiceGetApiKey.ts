import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { ApiKeyServiceGetApiKeyContext } from '../index.context';
import { apiKeyServiceGetApiKeyParams,
apiKeyServiceGetApiKeyResponse } from '../index.zod';

const factory = createFactory();


export const apiKeyServiceGetApiKeyHandlers = factory.createHandlers(
zValidator('param', apiKeyServiceGetApiKeyParams),
zValidator('response', apiKeyServiceGetApiKeyResponse),
async (c: ApiKeyServiceGetApiKeyContext) => {

  },
);
