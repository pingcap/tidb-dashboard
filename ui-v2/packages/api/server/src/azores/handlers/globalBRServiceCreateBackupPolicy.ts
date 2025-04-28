import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { GlobalBRServiceCreateBackupPolicyContext } from '../index.context';
import { globalBRServiceCreateBackupPolicyBody,
globalBRServiceCreateBackupPolicyResponse } from '../index.zod';

const factory = createFactory();


export const globalBRServiceCreateBackupPolicyHandlers = factory.createHandlers(
zValidator('json', globalBRServiceCreateBackupPolicyBody),
zValidator('response', globalBRServiceCreateBackupPolicyResponse),
async (c: GlobalBRServiceCreateBackupPolicyContext) => {

  },
);
