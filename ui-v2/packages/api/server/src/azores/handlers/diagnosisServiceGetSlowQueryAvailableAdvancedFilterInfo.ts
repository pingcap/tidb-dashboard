import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { DiagnosisServiceGetSlowQueryAvailableAdvancedFilterInfoContext } from '../index.context';
import { diagnosisServiceGetSlowQueryAvailableAdvancedFilterInfoParams,
diagnosisServiceGetSlowQueryAvailableAdvancedFilterInfoResponse } from '../index.zod';

const factory = createFactory();


export const diagnosisServiceGetSlowQueryAvailableAdvancedFilterInfoHandlers = factory.createHandlers(
zValidator('param', diagnosisServiceGetSlowQueryAvailableAdvancedFilterInfoParams),
zValidator('response', diagnosisServiceGetSlowQueryAvailableAdvancedFilterInfoResponse),
async (c: DiagnosisServiceGetSlowQueryAvailableAdvancedFilterInfoContext) => {

  },
);
