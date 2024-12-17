import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { LabelServiceDeleteLabelContext } from '../index.context';
import { labelServiceDeleteLabelParams,
labelServiceDeleteLabelResponse } from '../index.zod';

const factory = createFactory();


export const labelServiceDeleteLabelHandlers = factory.createHandlers(
zValidator('param', labelServiceDeleteLabelParams),
zValidator('response', labelServiceDeleteLabelResponse),
async (c: LabelServiceDeleteLabelContext) => {

  },
);
