import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { ApiKeyServiceUpdateApiKeyContext } from '../index.context';
import { apiKeyServiceUpdateApiKeyParams,
apiKeyServiceUpdateApiKeyBody,
apiKeyServiceUpdateApiKeyResponse } from '../index.zod';

const factory = createFactory();


export const apiKeyServiceUpdateApiKeyHandlers = factory.createHandlers(
zValidator('param', apiKeyServiceUpdateApiKeyParams),
zValidator('json', apiKeyServiceUpdateApiKeyBody),
zValidator('response', apiKeyServiceUpdateApiKeyResponse),
async (c: ApiKeyServiceUpdateApiKeyContext) => {

  },
);
