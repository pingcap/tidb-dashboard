import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { LabelServiceListLabelKeysContext } from '../index.context';
import { labelServiceListLabelKeysQueryParams,
labelServiceListLabelKeysResponse } from '../index.zod';

const factory = createFactory();


export const labelServiceListLabelKeysHandlers = factory.createHandlers(
zValidator('query', labelServiceListLabelKeysQueryParams),
zValidator('response', labelServiceListLabelKeysResponse),
async (c: LabelServiceListLabelKeysContext) => {

  },
);
