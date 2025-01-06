import { SQLWithHover } from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import { useTn } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { Box } from "@tidbcloud/uikit"
import { useMemo } from "react"

import { TableColsFactory } from "../../../_shared/cols-factory"
import { useAppContext } from "../../ctx"
import { SlowqueryModel } from "../../models"
import { useTimeRangeValueState } from "../../shared-state/memory-state"

function SqlCell({ row }: { row: SlowqueryModel }) {
  const ctx = useAppContext()
  const trv = useTimeRangeValueState((s) => s.trv)

  function handleClick() {
    const { digest, connection_id, timestamp } = row
    const id = [digest, connection_id, timestamp, trv[0], trv[1]].join(",")
    ctx.actions.openDetail(id)
  }

  return (
    <Box sx={{ cursor: "pointer" }} onClick={handleClick} w="100%">
      <SQLWithHover sql={row.query!} />
    </Box>
  )
}

export function useListTableColumns() {
  const { tk } = useTn("slow-query")
  const columns = useMemo(() => {
    const tcf = new TableColsFactory<SlowqueryModel>(tk)
    return tcf.columns([
      // basic
      tcf.text("query").patchConfig({
        minSize: 100,
        accessorFn: (row) => <SqlCell row={row} />,
      }),
      tcf.text("digest"),
      tcf.text("instance"),
      tcf.text("db"),
      tcf.text("connection_id"),
      tcf.timestamp("timestamp"),
      tcf.number("query_time", "s"),
      tcf.number("parse_time", "s"),
      tcf.number("compile_time", "s"),
      tcf.number("process_time", "s"),
      tcf.number("memory_max", "bytes"),
      tcf.number("disk_max", "bytes"),
      tcf.text("txn_start_ts"),
      tcf.text("success").patchConfig({
        accessorFn: (row) => (row.success === 1 ? "Yes" : "No"),
      }),
      tcf.text("is_internal").patchConfig({
        accessorFn: (row) => (row.is_internal === 1 ? "Yes" : "No"),
      }),
      tcf.text("prepared").patchConfig({
        accessorFn: (row) => (row.prepared === 1 ? "Yes" : "No"),
      }),
      tcf.text("index_names"),
      tcf.text("stats"),
      tcf.text("backoff_types"),
      // connection
      tcf.text("user"),
      tcf.text("host"),
      // time
      tcf.number("wait_time", "s"),
      tcf.number("backoff_time", "s"),
      tcf.number("get_commit_ts_time", "s"),
      tcf.number("local_latch_wait_time", "s"),
      tcf.number("prewrite_time", "s"),
      tcf.number("commit_time", "s"),
      tcf.number("commit_backoff_time", "s"),
      tcf.number("resolve_lock_time", "s"),
      // cop
      tcf.number("cop_proc_avg", "s"),
      tcf.number("cop_proc_max", "s"),
      tcf.number("cop_proc_p90", "s"),
      tcf.number("cop_wait_avg", "s"),
      tcf.number("cop_wait_max", "s"),
      tcf.number("cop_wait_p90", "s"),
      // tcf.number("cop_time", "s"),
      tcf.number("request_count", "short"),
      tcf.number("process_keys", "short"),
      tcf.number("total_keys", "short"),
      tcf.text("cop_proc_addr"),
      tcf.text("cop_wait_addr"),
      // transaction
      tcf.number("write_keys", "short"),
      tcf.number("write_size", "bytes"),
      tcf.number("prewrite_region", "short"),
      tcf.number("txn_retry", "short"),
      // rocksdb
      tcf.number("rocksdb_delete_skipped_count", "short"),
      tcf.number("rocksdb_key_skipped_count", "short"),
      tcf.number("rocksdb_block_cache_hit_count", "short"),
      tcf.number("rocksdb_block_read_count", "short"),
      tcf.number("rocksdb_block_read_byte", "bytes"),
      // resource control
      tcf.number("ru", "short"), // @todo: fix
      tcf.text("resource_group"),
      tcf.number("time_queued_by_rc", "s"),
    ])
  }, [tk])

  return columns
}
