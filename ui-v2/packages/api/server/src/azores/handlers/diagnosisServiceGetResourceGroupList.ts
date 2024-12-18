import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { DiagnosisServiceGetResourceGroupListContext } from '../index.context';
import { diagnosisServiceGetResourceGroupListParams,
diagnosisServiceGetResourceGroupListResponse } from '../index.zod';

const factory = createFactory();


export const diagnosisServiceGetResourceGroupListHandlers = factory.createHandlers(
zValidator('param', diagnosisServiceGetResourceGroupListParams),
zValidator('response', diagnosisServiceGetResourceGroupListResponse),
async (c: DiagnosisServiceGetResourceGroupListContext) => {

  },
);
