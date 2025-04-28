import { RouterProvider as TanstackRouterProvider } from "@tanstack/react-router"

import { router } from "./router"

export function RouterProvider() {
  return <TanstackRouterProvider router={router} />
}
