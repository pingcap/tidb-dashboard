import { SQLWithHover } from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import { useTn } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { Box } from "@tidbcloud/uikit"
import { useMemo } from "react"

import { useAppContext } from "../../ctx"
import { SlowqueryModel } from "../../models"
import { useTimeRangeValueState } from "../../shared-state/memory-state"

import { TableColsFactory } from "./cols-factory"

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

// @ts-expect-error @typescript-eslint/no-unused-vars
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function useLocales() {
  const { tk } = useTn("slow-query")
  // used for gogocode to scan and generate en.json before build
  tk("fields.instance", "TiDB Instance")
  tk("fields.connection_id", "Connection ID")
  tk("fields.query", "Query")
  tk("fields.timestamp", "Finish Time")
  tk("fields.query_time", "Latency")
  tk("fields.memory_max", "Max Memory")
  tk("fields.disk_max", "Max Disk")
  tk("fields.digest", "Query Template ID")
  tk("fields.is_internal", "Is Internal?")
  tk("fields.success", "Is Success?")
  tk("fields.prepared", "Is Prepared?")
  tk("fields.plan_from_cache", "Is Plan from Cache?")
  tk("fields.plan_from_binding", "Is Plan from Binding?")
  tk("fields.index_names", "Index Names")
  tk("fields.stats", "Used Statistics")
  tk("fields.backoff_types", "Backoff Types")
  tk("fields.user", "Execution User")
  tk("fields.host", "Client Address")
  tk("fields.db", "Execution Database")
  tk("fields.parse_time", "Parse Time")
  tk("fields.compile_time", "Generate Plan Time")
  tk("fields.rewrite_time", "Rewrite Plan Time")
  tk("fields.optimize_time", "Optimize Plan Time")
  tk("fields.wait_ts", "Get Start Ts Time")
  tk("fields.cop_time", "Coprocessor Executor Time")
  tk("fields.wait_time", "Coprocessor Wait Time")
  tk("fields.process_time", "Coprocessor Process Time")
  tk("fields.backoff_time", "Execution Backoff Time")
  tk("fields.lock_keys_time", "Lock Keys Time")
  tk("fields.get_commit_ts_time", "Get Commit Ts Time")
  tk("fields.local_latch_wait_time", "Local Latch Wait Time")
  tk("fields.resolve_lock_time", "Resolve Lock Time")
  tk("fields.prewrite_time", "Prewrite Time")
  tk("fields.wait_prewrite_binlog_time", "Wait Binlog Prewrite Time")
  tk("fields.commit_time", "Commit Time")
  tk("fields.commit_backoff_time", "Commit Backoff Time")
  tk("fields.write_sql_response_total", "Send Response Time")
  tk("fields.exec_retry_time", "Retried Execution Time")
  tk("fields.request_count", "Request Count")
  tk("fields.process_keys", "Process Keys")
  tk("fields.total_keys", "Total Keys")
  tk("fields.cop_proc_addr", "Copr Address (Process)")
  tk("fields.cop_wait_addr", "Copr Address (Wait)")
  tk("fields.txn_start_ts", "Start Timestamp")
  tk("fields.write_keys", "Write Keys")
  tk("fields.write_size", "Write Size")
  tk("fields.prewrite_region", "Prewrite Regions")
  tk("fields.txn_retry", "Transaction Retries")
  tk("fields.prev_stmt", "Previous Query")
  tk("fields.plan", "Execution Plan")
  tk("fields.cop_proc_avg", "Mean Cop Proc")
  tk("fields.cop_proc_max", "Max Cop Proc")
  tk("fields.cop_proc_p90", "P90 Cop Proc")
  tk("fields.cop_wait_avg", "Mean Cop Wait")
  tk("fields.cop_wait_max", "Max Cop Wait")
  tk("fields.cop_wait_p90", "P90 Cop Wait")
  // rocksdb
  tk("fields.rocksdb_delete_skipped_count", "RocksDB Skipped Deletions")
  tk("fields.rocksdb_key_skipped_count", "RocksDB Skipped Keys")
  tk("fields.rocksdb_block_cache_hit_count", "RocksDB Block Cache Hits")
  tk("fields.rocksdb_block_read_count", "RocksDB Block Reads")
  tk("fields.rocksdb_block_read_byte", "RocksDB Read Size")
  // resource control
  tk("fields.ru", "Request Unit")
  tk("fields.resource_group", "Resource Group")
  tk("fields.time_queued_by_rc", "Total Time Queued by RC")
  // others
  tk("fields.preproc_subqueries_time", "Preprocess Subqueries Time")
  tk("fields.binary_plan", "Binary Plan")
  tk("fields.warnings", "Warnings")
  tk("fields.session_alias", "Session Alias")
  tk("fields.exec_retry_count", "Retried Execution Count")
  tk("fields.preproc_subqueries", "Preprocess Subqueries")
  tk("fields.kv_total", "KV Total")
  tk("fields.pd_total", "PD Total")
  tk("fields.backoff_total", "Backoff Total")
  tk("fields.backoff_detail", "Backoff Detail")
  tk("fields.is_explicit_txn", "Is Explicit Transaction?")
  tk("fields.plan_digest", "Plan Digest")
  tk("fields.has_more_results", "Has More Results?")
  tk("fields.request_unit_read", "Request Unit Read")
  tk("fields.request_unit_write", "Request Unit Write")
  tk("fields.result_rows", "Result Rows")
}
