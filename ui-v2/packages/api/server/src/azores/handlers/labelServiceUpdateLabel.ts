import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { LabelServiceUpdateLabelContext } from '../index.context';
import { labelServiceUpdateLabelParams,
labelServiceUpdateLabelBody,
labelServiceUpdateLabelResponse } from '../index.zod';

const factory = createFactory();


export const labelServiceUpdateLabelHandlers = factory.createHandlers(
zValidator('param', labelServiceUpdateLabelParams),
zValidator('json', labelServiceUpdateLabelBody),
zValidator('response', labelServiceUpdateLabelResponse),
async (c: LabelServiceUpdateLabelContext) => {

  },
);
