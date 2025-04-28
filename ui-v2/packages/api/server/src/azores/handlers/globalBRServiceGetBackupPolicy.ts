import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { GlobalBRServiceGetBackupPolicyContext } from '../index.context';
import { globalBRServiceGetBackupPolicyParams,
globalBRServiceGetBackupPolicyResponse } from '../index.zod';

const factory = createFactory();


export const globalBRServiceGetBackupPolicyHandlers = factory.createHandlers(
zValidator('param', globalBRServiceGetBackupPolicyParams),
zValidator('response', globalBRServiceGetBackupPolicyResponse),
async (c: GlobalBRServiceGetBackupPolicyContext) => {

  },
);
