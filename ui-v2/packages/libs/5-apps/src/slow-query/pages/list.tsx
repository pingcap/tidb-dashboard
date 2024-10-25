import {
  Box,
  Button,
  Container,
  Loader,
  Table,
  TextInput,
  Title,
} from "@pingcap-incubator/tidb-dashboard-lib-primitive-ui"
import { useQuery } from "@tanstack/react-query"

import { useAppContext } from "../cxt/context"

import { useListUrlState } from "./list-url-state"

export function List() {
  const ctx = useAppContext()
  const { term, setTerm } = useListUrlState()

  const { data: slowQueryList, isLoading } = useQuery({
    queryKey: ["slow-query", "list", ctx.extra.clusterId, term],
    queryFn: () => {
      return ctx.api.getSlowQueries({ term })
    },
  })

  function handleSubmit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault()
    const formData = new FormData(ev.target as HTMLFormElement)
    setTerm(formData.get("term") as string)
  }

  return (
    <Container>
      <Title order={1} mb="md">
        {ctx.cfg.title ?? "Slow Query App"}
      </Title>

      {ctx.cfg.showSearch && (
        <Box mb="md">
          <form onSubmit={handleSubmit}>
            <TextInput name="term" placeholder="Search" defaultValue={term} />
          </form>
        </Box>
      )}

      {isLoading && <Loader />}

      {slowQueryList && (
        <Table>
          <thead>
            <tr>
              <th>Query</th>
              <th>Latency</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {slowQueryList.map((s) => (
              <tr key={s.id}>
                <td>{s.query}</td>
                <td>{s.latency}</td>
                <td>
                  <Button onClick={() => ctx.actions.openDetail(s.id)}>
                    View
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Container>
  )
}
