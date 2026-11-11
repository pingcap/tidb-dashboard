import { SlowqueryModel } from '@lib/client'

// Clinic adds these optional metrics to the shared Dashboard response.
export type SlowQueryTimingModel = SlowqueryModel & {
  backoff_total?: number | null
  read_resolve_lock_rpc_time?: number | null
}
