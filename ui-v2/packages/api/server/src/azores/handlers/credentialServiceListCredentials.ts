import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { CredentialServiceListCredentialsContext } from '../index.context';
import { credentialServiceListCredentialsQueryParams,
credentialServiceListCredentialsResponse } from '../index.zod';

const factory = createFactory();


export const credentialServiceListCredentialsHandlers = factory.createHandlers(
zValidator('query', credentialServiceListCredentialsQueryParams),
zValidator('response', credentialServiceListCredentialsResponse),
async (c: CredentialServiceListCredentialsContext) => {

  },
);
