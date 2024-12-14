import { createFactory } from "hono/factory"
import { zValidator } from "../index.validator"
import { ClusterServiceDeleteProcessContext } from "../index.context"
import {
  clusterServiceDeleteProcessParams,
  clusterServiceDeleteProcessResponse,
} from "../index.zod"

const factory = createFactory()

export const clusterServiceDeleteProcessHandlers = factory.createHandlers(
  zValidator("param", clusterServiceDeleteProcessParams),
  zValidator("response", clusterServiceDeleteProcessResponse),
  async (c: ClusterServiceDeleteProcessContext) => {},
)
