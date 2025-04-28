import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { GlobalBRServiceUpdateBackupPolicyContext } from '../index.context';
import { globalBRServiceUpdateBackupPolicyParams,
globalBRServiceUpdateBackupPolicyBody,
globalBRServiceUpdateBackupPolicyResponse } from '../index.zod';

const factory = createFactory();


export const globalBRServiceUpdateBackupPolicyHandlers = factory.createHandlers(
zValidator('param', globalBRServiceUpdateBackupPolicyParams),
zValidator('json', globalBRServiceUpdateBackupPolicyBody),
zValidator('response', globalBRServiceUpdateBackupPolicyResponse),
async (c: GlobalBRServiceUpdateBackupPolicyContext) => {

  },
);
