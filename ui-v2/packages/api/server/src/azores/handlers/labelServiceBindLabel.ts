import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { LabelServiceBindLabelContext } from '../index.context';
import { labelServiceBindLabelBody,
labelServiceBindLabelResponse } from '../index.zod';

const factory = createFactory();


export const labelServiceBindLabelHandlers = factory.createHandlers(
zValidator('json', labelServiceBindLabelBody),
zValidator('response', labelServiceBindLabelResponse),
async (c: LabelServiceBindLabelContext) => {

  },
);
