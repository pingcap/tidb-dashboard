import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { CredentialServiceDownloadRSAKeyContext } from '../index.context';
import { credentialServiceDownloadRSAKeyBody,
credentialServiceDownloadRSAKeyResponse } from '../index.zod';

const factory = createFactory();


export const credentialServiceDownloadRSAKeyHandlers = factory.createHandlers(
zValidator('json', credentialServiceDownloadRSAKeyBody),
zValidator('response', credentialServiceDownloadRSAKeyResponse),
async (c: CredentialServiceDownloadRSAKeyContext) => {

  },
);
