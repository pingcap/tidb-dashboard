import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { UserServiceDeleteUserContext } from '../index.context';
import { userServiceDeleteUserParams,
userServiceDeleteUserResponse } from '../index.zod';

const factory = createFactory();


export const userServiceDeleteUserHandlers = factory.createHandlers(
zValidator('param', userServiceDeleteUserParams),
zValidator('response', userServiceDeleteUserResponse),
async (c: UserServiceDeleteUserContext) => {

  },
);
