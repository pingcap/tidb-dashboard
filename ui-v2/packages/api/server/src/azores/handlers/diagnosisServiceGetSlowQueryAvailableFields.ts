import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { DiagnosisServiceGetSlowQueryAvailableFieldsContext } from '../index.context';
import { diagnosisServiceGetSlowQueryAvailableFieldsParams,
diagnosisServiceGetSlowQueryAvailableFieldsResponse } from '../index.zod';

const factory = createFactory();


export const diagnosisServiceGetSlowQueryAvailableFieldsHandlers = factory.createHandlers(
zValidator('param', diagnosisServiceGetSlowQueryAvailableFieldsParams),
zValidator('response', diagnosisServiceGetSlowQueryAvailableFieldsResponse),
async (c: DiagnosisServiceGetSlowQueryAvailableFieldsContext) => {

  },
);
