import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { GlobalBRServicePreCheckBackupPolicyContext } from '../index.context';
import { globalBRServicePreCheckBackupPolicyBody,
globalBRServicePreCheckBackupPolicyResponse } from '../index.zod';

const factory = createFactory();


export const globalBRServicePreCheckBackupPolicyHandlers = factory.createHandlers(
zValidator('json', globalBRServicePreCheckBackupPolicyBody),
zValidator('response', globalBRServicePreCheckBackupPolicyResponse),
async (c: GlobalBRServicePreCheckBackupPolicyContext) => {

  },
);
