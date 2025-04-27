import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { DiagnosisServiceGetTopSqlAvailableAdvancedFilterInfoContext } from '../index.context';
import { diagnosisServiceGetTopSqlAvailableAdvancedFilterInfoParams,
diagnosisServiceGetTopSqlAvailableAdvancedFilterInfoResponse } from '../index.zod';

const factory = createFactory();


export const diagnosisServiceGetTopSqlAvailableAdvancedFilterInfoHandlers = factory.createHandlers(
zValidator('param', diagnosisServiceGetTopSqlAvailableAdvancedFilterInfoParams),
zValidator('response', diagnosisServiceGetTopSqlAvailableAdvancedFilterInfoResponse),
async (c: DiagnosisServiceGetTopSqlAvailableAdvancedFilterInfoContext) => {

  },
);
