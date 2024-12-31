import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { LabelServiceGetLabelContext } from '../index.context';
import { labelServiceGetLabelParams,
labelServiceGetLabelResponse } from '../index.zod';

const factory = createFactory();


export const labelServiceGetLabelHandlers = factory.createHandlers(
zValidator('param', labelServiceGetLabelParams),
zValidator('response', labelServiceGetLabelResponse),
async (c: LabelServiceGetLabelContext) => {

  },
);
