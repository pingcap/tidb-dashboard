import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { CredentialServiceGenerateRSAKeyContext } from '../index.context';
import { credentialServiceGenerateRSAKeyBody,
credentialServiceGenerateRSAKeyResponse } from '../index.zod';

const factory = createFactory();


export const credentialServiceGenerateRSAKeyHandlers = factory.createHandlers(
zValidator('json', credentialServiceGenerateRSAKeyBody),
zValidator('response', credentialServiceGenerateRSAKeyResponse),
async (c: CredentialServiceGenerateRSAKeyContext) => {

  },
);
