import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { GlobalBRServiceListBackupPoliciesContext } from '../index.context';
import { globalBRServiceListBackupPoliciesQueryParams,
globalBRServiceListBackupPoliciesResponse } from '../index.zod';

const factory = createFactory();


export const globalBRServiceListBackupPoliciesHandlers = factory.createHandlers(
zValidator('query', globalBRServiceListBackupPoliciesQueryParams),
zValidator('response', globalBRServiceListBackupPoliciesResponse),
async (c: GlobalBRServiceListBackupPoliciesContext) => {

  },
);
