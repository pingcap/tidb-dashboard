import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { LabelServiceListLabelsByResourceTypeContext } from '../index.context';
import { labelServiceListLabelsByResourceTypeQueryParams,
labelServiceListLabelsByResourceTypeResponse } from '../index.zod';

const factory = createFactory();


export const labelServiceListLabelsByResourceTypeHandlers = factory.createHandlers(
zValidator('query', labelServiceListLabelsByResourceTypeQueryParams),
zValidator('response', labelServiceListLabelsByResourceTypeResponse),
async (c: LabelServiceListLabelsByResourceTypeContext) => {

  },
);
