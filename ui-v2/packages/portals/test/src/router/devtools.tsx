import React from "react"

export const RouterDevtools =
  process.env.NODE_ENV === "production" ||
  import.meta.env.VITE_TANSTACK_ROUTER_DEVTOOLS_ENABLED !== "true"
    ? () => null
    : React.lazy(() =>
        import("@tanstack/router-devtools").then((res) => ({
          default: res.TanStackRouterDevtools,
        })),
      )
