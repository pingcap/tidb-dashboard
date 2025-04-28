import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { GlobalBRServiceDeleteBackupPolicyContext } from '../index.context';
import { globalBRServiceDeleteBackupPolicyParams,
globalBRServiceDeleteBackupPolicyResponse } from '../index.zod';

const factory = createFactory();


export const globalBRServiceDeleteBackupPolicyHandlers = factory.createHandlers(
zValidator('param', globalBRServiceDeleteBackupPolicyParams),
zValidator('response', globalBRServiceDeleteBackupPolicyResponse),
async (c: GlobalBRServiceDeleteBackupPolicyContext) => {

  },
);
