import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { CredentialServiceValidateConnectionContext } from '../index.context';
import { credentialServiceValidateConnectionBody,
credentialServiceValidateConnectionResponse } from '../index.zod';

const factory = createFactory();


export const credentialServiceValidateConnectionHandlers = factory.createHandlers(
zValidator('json', credentialServiceValidateConnectionBody),
zValidator('response', credentialServiceValidateConnectionResponse),
async (c: CredentialServiceValidateConnectionContext) => {

  },
);
