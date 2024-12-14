import { createFactory } from "hono/factory"
import { zValidator } from "../index.validator"
import { RoleServiceDeleteRoleContext } from "../index.context"
import {
  roleServiceDeleteRoleParams,
  roleServiceDeleteRoleResponse,
} from "../index.zod"

const factory = createFactory()

export const roleServiceDeleteRoleHandlers = factory.createHandlers(
  zValidator("param", roleServiceDeleteRoleParams),
  zValidator("response", roleServiceDeleteRoleResponse),
  async (c: RoleServiceDeleteRoleContext) => {},
)
