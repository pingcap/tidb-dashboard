import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { UserServiceListUserRolesContext } from '../index.context';
import { userServiceListUserRolesQueryParams,
userServiceListUserRolesResponse } from '../index.zod';

const factory = createFactory();


export const userServiceListUserRolesHandlers = factory.createHandlers(
zValidator('query', userServiceListUserRolesQueryParams),
zValidator('response', userServiceListUserRolesResponse),
async (c: UserServiceListUserRolesContext) => {

  },
);
