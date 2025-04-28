import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { CredentialServiceCreateCredentialContext } from '../index.context';
import { credentialServiceCreateCredentialBody,
credentialServiceCreateCredentialResponse } from '../index.zod';

const factory = createFactory();


export const credentialServiceCreateCredentialHandlers = factory.createHandlers(
zValidator('json', credentialServiceCreateCredentialBody),
zValidator('response', credentialServiceCreateCredentialResponse),
async (c: CredentialServiceCreateCredentialContext) => {

  },
);
