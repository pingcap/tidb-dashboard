import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { ClusterBRServiceGetClusterBackupPolicyContext } from '../index.context';
import { clusterBRServiceGetClusterBackupPolicyParams,
clusterBRServiceGetClusterBackupPolicyResponse } from '../index.zod';

const factory = createFactory();


export const clusterBRServiceGetClusterBackupPolicyHandlers = factory.createHandlers(
zValidator('param', clusterBRServiceGetClusterBackupPolicyParams),
zValidator('response', clusterBRServiceGetClusterBackupPolicyResponse),
async (c: ClusterBRServiceGetClusterBackupPolicyContext) => {

  },
);
