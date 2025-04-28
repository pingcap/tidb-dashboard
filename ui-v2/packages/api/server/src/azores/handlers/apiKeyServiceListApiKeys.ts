import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { ApiKeyServiceListApiKeysContext } from '../index.context';
import { apiKeyServiceListApiKeysQueryParams,
apiKeyServiceListApiKeysResponse } from '../index.zod';

const factory = createFactory();


export const apiKeyServiceListApiKeysHandlers = factory.createHandlers(
zValidator('query', apiKeyServiceListApiKeysQueryParams),
zValidator('response', apiKeyServiceListApiKeysResponse),
async (c: ApiKeyServiceListApiKeysContext) => {

  },
);
