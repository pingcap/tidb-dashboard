import { createFactory } from "hono/factory"
import { zValidator } from "../index.validator"
import { UserServiceListUsersContext } from "../index.context"
import {
  userServiceListUsersQueryParams,
  userServiceListUsersResponse,
} from "../index.zod"

const factory = createFactory()

export const userServiceListUsersHandlers = factory.createHandlers(
  zValidator("query", userServiceListUsersQueryParams),
  zValidator("response", userServiceListUsersResponse),
  async (c: UserServiceListUsersContext) => {},
)
