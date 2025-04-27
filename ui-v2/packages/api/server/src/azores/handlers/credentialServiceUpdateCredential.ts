import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { CredentialServiceUpdateCredentialContext } from '../index.context';
import { credentialServiceUpdateCredentialParams,
credentialServiceUpdateCredentialBody,
credentialServiceUpdateCredentialResponse } from '../index.zod';

const factory = createFactory();


export const credentialServiceUpdateCredentialHandlers = factory.createHandlers(
zValidator('param', credentialServiceUpdateCredentialParams),
zValidator('json', credentialServiceUpdateCredentialBody),
zValidator('response', credentialServiceUpdateCredentialResponse),
async (c: CredentialServiceUpdateCredentialContext) => {

  },
);
