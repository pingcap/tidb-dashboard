import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { HostServiceDownloadHostTemplateContext } from '../index.context';
import { hostServiceDownloadHostTemplateResponse } from '../index.zod';

const factory = createFactory();


export const hostServiceDownloadHostTemplateHandlers = factory.createHandlers(
zValidator('response', hostServiceDownloadHostTemplateResponse),
async (c: HostServiceDownloadHostTemplateContext) => {

  },
);
