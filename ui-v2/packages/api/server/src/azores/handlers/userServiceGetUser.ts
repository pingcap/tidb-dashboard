import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { UserServiceGetUserContext } from '../index.context';
import { userServiceGetUserParams,
userServiceGetUserResponse } from '../index.zod';

const factory = createFactory();


export const userServiceGetUserHandlers = factory.createHandlers(
zValidator('param', userServiceGetUserParams),
zValidator('response', userServiceGetUserResponse),
async (c: UserServiceGetUserContext) => {

  },
);
