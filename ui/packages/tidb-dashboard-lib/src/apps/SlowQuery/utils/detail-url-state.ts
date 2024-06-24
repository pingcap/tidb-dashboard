import useUrlState from '@ahooksjs/use-url-state'

type DetailUrlState = Partial<
  Record<'digest' | 'connection_id' | 'timestamp', string>
>

export function useSlowQueryDetailUrlState() {
  const [queryParams, _] = useUrlState<DetailUrlState>()

  // digest
  const digest = queryParams.digest ?? ''
  // connect_id
  const connectionId = queryParams.connection_id ?? ''
  // timestamp, timestamp is float type number
  const timestamp = parseFloat(queryParams.timestamp)

  return {
    digest,
    connectionId,
    timestamp
  }
}
