import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { RoleServiceListRolesContext } from '../index.context';
import { roleServiceListRolesQueryParams,
roleServiceListRolesResponse } from '../index.zod';

const factory = createFactory();


export const roleServiceListRolesHandlers = factory.createHandlers(
zValidator('query', roleServiceListRolesQueryParams),
zValidator('response', roleServiceListRolesResponse),
async (c: RoleServiceListRolesContext) => {

  },
);
