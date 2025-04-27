import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { UserServiceGetUserProfileContext } from '../index.context';
import { userServiceGetUserProfileResponse } from '../index.zod';

const factory = createFactory();


export const userServiceGetUserProfileHandlers = factory.createHandlers(
zValidator('response', userServiceGetUserProfileResponse),
async (c: UserServiceGetUserProfileContext) => {

  },
);
