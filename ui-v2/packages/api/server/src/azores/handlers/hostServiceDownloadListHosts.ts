import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { HostServiceDownloadListHostsContext } from '../index.context';
import { hostServiceDownloadListHostsQueryParams,
hostServiceDownloadListHostsResponse } from '../index.zod';

const factory = createFactory();


export const hostServiceDownloadListHostsHandlers = factory.createHandlers(
zValidator('query', hostServiceDownloadListHostsQueryParams),
zValidator('response', hostServiceDownloadListHostsResponse),
async (c: HostServiceDownloadListHostsContext) => {

  },
);
