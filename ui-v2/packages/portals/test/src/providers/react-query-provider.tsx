import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

// Create a react query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      // retry: 1
      // refetchOnMount: false,
      // refetchOnReconnect: false,
    },
  },
})

export function ReactQueryProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // Provide the client to your App
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
