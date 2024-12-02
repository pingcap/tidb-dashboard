import { createLazyFileRoute } from "@tanstack/react-router"

export const Route = createLazyFileRoute("/login")({
  component: LoginPage,
})

function LoginPage() {
  return <>Login</>
}
