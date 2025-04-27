import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { ClusterBRServiceCreateRestoreTaskContext } from '../index.context';
import { clusterBRServiceCreateRestoreTaskParams,
clusterBRServiceCreateRestoreTaskBody,
clusterBRServiceCreateRestoreTaskResponse } from '../index.zod';

const factory = createFactory();


export const clusterBRServiceCreateRestoreTaskHandlers = factory.createHandlers(
zValidator('param', clusterBRServiceCreateRestoreTaskParams),
zValidator('json', clusterBRServiceCreateRestoreTaskBody),
zValidator('response', clusterBRServiceCreateRestoreTaskResponse),
async (c: ClusterBRServiceCreateRestoreTaskContext) => {

  },
);
