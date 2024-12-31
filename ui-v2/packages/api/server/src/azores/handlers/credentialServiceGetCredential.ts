import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { CredentialServiceGetCredentialContext } from '../index.context';
import { credentialServiceGetCredentialParams,
credentialServiceGetCredentialResponse } from '../index.zod';

const factory = createFactory();


export const credentialServiceGetCredentialHandlers = factory.createHandlers(
zValidator('param', credentialServiceGetCredentialParams),
zValidator('response', credentialServiceGetCredentialResponse),
async (c: CredentialServiceGetCredentialContext) => {

  },
);
