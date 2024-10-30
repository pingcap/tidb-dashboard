import {
  Button,
  Loader,
  Stack,
  Table,
  Title,
} from "@pingcap-incubator/tidb-dashboard-lib-primitive-ui"

import { Filters } from "../components/filters"
import { useAppContext } from "../cxt/context"
import { useListData } from "../utils/use-data"

export function List() {
  const ctx = useAppContext()

  const { data: slowQueryList, isLoading } = useListData()

  return (
    <Stack>
      {ctx.cfg.title && (
        <Title order={1} mb="md">
          {ctx.cfg.title}
        </Title>
      )}

      <Filters />

      {isLoading && <Loader />}

      {slowQueryList && (
        <Table withBorder>
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
    </Stack>
  )
}