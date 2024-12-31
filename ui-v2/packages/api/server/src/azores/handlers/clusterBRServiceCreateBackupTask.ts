import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { ClusterBRServiceCreateBackupTaskContext } from '../index.context';
import { clusterBRServiceCreateBackupTaskParams,
clusterBRServiceCreateBackupTaskBody,
clusterBRServiceCreateBackupTaskResponse } from '../index.zod';

const factory = createFactory();


export const clusterBRServiceCreateBackupTaskHandlers = factory.createHandlers(
zValidator('param', clusterBRServiceCreateBackupTaskParams),
zValidator('json', clusterBRServiceCreateBackupTaskBody),
zValidator('response', clusterBRServiceCreateBackupTaskResponse),
async (c: ClusterBRServiceCreateBackupTaskContext) => {

  },
);
