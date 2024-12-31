import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { CredentialServiceDeleteCredentialContext } from '../index.context';
import { credentialServiceDeleteCredentialParams,
credentialServiceDeleteCredentialResponse } from '../index.zod';

const factory = createFactory();


export const credentialServiceDeleteCredentialHandlers = factory.createHandlers(
zValidator('param', credentialServiceDeleteCredentialParams),
zValidator('response', credentialServiceDeleteCredentialResponse),
async (c: CredentialServiceDeleteCredentialContext) => {

  },
);
