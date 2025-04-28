import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { HostServiceReportContext } from '../index.context';
import { hostServiceReportParams,
hostServiceReportResponse } from '../index.zod';

const factory = createFactory();


export const hostServiceReportHandlers = factory.createHandlers(
zValidator('param', hostServiceReportParams),
zValidator('response', hostServiceReportResponse),
async (c: HostServiceReportContext) => {

  },
);
