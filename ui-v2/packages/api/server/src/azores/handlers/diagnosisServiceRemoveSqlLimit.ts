import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { DiagnosisServiceRemoveSqlLimitContext } from '../index.context';
import { diagnosisServiceRemoveSqlLimitParams,
diagnosisServiceRemoveSqlLimitBody,
diagnosisServiceRemoveSqlLimitResponse } from '../index.zod';

const factory = createFactory();


export const diagnosisServiceRemoveSqlLimitHandlers = factory.createHandlers(
zValidator('param', diagnosisServiceRemoveSqlLimitParams),
zValidator('json', diagnosisServiceRemoveSqlLimitBody),
zValidator('response', diagnosisServiceRemoveSqlLimitResponse),
async (c: DiagnosisServiceRemoveSqlLimitContext) => {

  },
);
