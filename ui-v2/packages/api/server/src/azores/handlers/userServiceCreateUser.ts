import { createFactory } from "hono/factory"
import { zValidator } from "../index.validator"
import { UserServiceCreateUserContext } from "../index.context"
import {
  userServiceCreateUserBody,
  userServiceCreateUserResponse,
} from "../index.zod"

const factory = createFactory()

export const userServiceCreateUserHandlers = factory.createHandlers(
  zValidator("json", userServiceCreateUserBody),
  zValidator("response", userServiceCreateUserResponse),
  async (c: UserServiceCreateUserContext) => {},
)
