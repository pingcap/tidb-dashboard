import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { ClusterBRServiceListClusterBackupRecordsContext } from '../index.context';
import { clusterBRServiceListClusterBackupRecordsParams,
clusterBRServiceListClusterBackupRecordsQueryParams,
clusterBRServiceListClusterBackupRecordsResponse } from '../index.zod';

const factory = createFactory();


export const clusterBRServiceListClusterBackupRecordsHandlers = factory.createHandlers(
zValidator('param', clusterBRServiceListClusterBackupRecordsParams),
zValidator('query', clusterBRServiceListClusterBackupRecordsQueryParams),
zValidator('response', clusterBRServiceListClusterBackupRecordsResponse),
async (c: ClusterBRServiceListClusterBackupRecordsContext) => {

  },
);
