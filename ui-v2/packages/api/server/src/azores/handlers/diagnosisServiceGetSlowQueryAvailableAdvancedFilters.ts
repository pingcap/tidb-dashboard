import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { DiagnosisServiceGetSlowQueryAvailableAdvancedFiltersContext } from '../index.context';
import { diagnosisServiceGetSlowQueryAvailableAdvancedFiltersParams,
diagnosisServiceGetSlowQueryAvailableAdvancedFiltersResponse } from '../index.zod';

const factory = createFactory();


export const diagnosisServiceGetSlowQueryAvailableAdvancedFiltersHandlers = factory.createHandlers(
zValidator('param', diagnosisServiceGetSlowQueryAvailableAdvancedFiltersParams),
zValidator('response', diagnosisServiceGetSlowQueryAvailableAdvancedFiltersResponse),
async (c: DiagnosisServiceGetSlowQueryAvailableAdvancedFiltersContext) => {

  },
);
