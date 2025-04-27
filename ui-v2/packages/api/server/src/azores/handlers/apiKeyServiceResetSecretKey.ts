import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { ApiKeyServiceResetSecretKeyContext } from '../index.context';
import { apiKeyServiceResetSecretKeyParams,
apiKeyServiceResetSecretKeyResponse } from '../index.zod';

const factory = createFactory();


export const apiKeyServiceResetSecretKeyHandlers = factory.createHandlers(
zValidator('param', apiKeyServiceResetSecretKeyParams),
zValidator('response', apiKeyServiceResetSecretKeyResponse),
async (c: ApiKeyServiceResetSecretKeyContext) => {

  },
);
