import { useTn } from "@pingcap-incubator/tidb-dashboard-lib-utils"

// @ts-expect-error @typescript-eslint/no-unused-vars
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function useLocales() {
  const { tk } = useTn("statement")
  // used for gogocode to scan and generate en.json before build
  tk("fields.table_names", "Table Names")
  tk("fields.related_schemas", "Database")
  tk("fields.related_schemas.desc", "Related databases of the statement")
  tk("fields.plan_digest", "Plan ID")
  tk(
    "fields.plan_digest.desc",
    "Different execution plans have different plan ID",
  )
  tk("fields.digest_text", "Statement Template")
  tk(
    "fields.digest_text.desc",
    "Similar queries have same statement template even for different query parameters",
  )
  tk("fields.sum_latency", "Total Latency")
  tk(
    "fields.sum_latency.desc",
    "Total execution time for this kind of statement",
  )
  tk("fields.exec_count", "Execution Count")
  tk(
    "fields.exec_count.desc",
    "Total execution count for this kind of statement",
  )
  tk("fields.plan_count", "Plans Count")
  tk(
    "fields.plan_count.desc",
    "Number of distinct execution plans of this statement in current time range",
  )
  tk("fields.plan_cache_hits", "Plan Cache Hits Count")
  tk(
    "fields.plan_cache_hits.desc",
    "Number of times the execution plan cache is hit",
  )
  tk("fields.avg_latency", "Mean Latency")
  tk("fields.avg_latency.desc", "Execution time of single query")
  tk("fields.avg_mem", "Mean Memory")
  tk("fields.avg_mem.desc", "Memory usage of single query")
  tk("fields.max_mem", "Max Memory")
  tk("fields.max_mem.desc", "Maximum memory usage of single query")
  tk("fields.avg_disk", "Mean Disk")
  tk("fields.avg_disk.desc", "Disk usage of single query")
  tk("fields.max_disk", "Max Disk")
  tk("fields.max_disk.desc", "Maximum disk usage of single query")
  tk("fields.index_names", "Index Name")
  tk("fields.index_names.desc", "The name of the used index")
  tk("fields.first_seen", "First Seen")
  tk("fields.last_seen", "Last Seen")
  tk("fields.sample_user", "Execution User")
  tk("fields.sample_user.desc", "The user that executes the query (sampled)")
  tk("fields.sum_errors", "Total Errors")
  tk("fields.sum_warnings", "Total Warnings")
  tk("fields.errors_warnings", "Errors / Warnings")
  tk("fields.errors_warnings.desc", "Total Errors and Total Warnings")
  tk("fields.parse_latency", "Parse Time")
  tk("fields.parse_latency.desc", "Time consumed when parsing the query")
  tk("fields.compile_latency", "Compile")
  tk("fields.compile_latency.desc", "Time consumed when optimizing the query")
  tk("fields.wait_time", "Coprocessor Wait Time")
  tk("fields.wait_time.desc", " ") // @todo
  tk("fields.process_time", "Coprocessor Execution Time")
  tk("fields.process_time.desc", " ") // @todo
  tk("fields.total_process_time", "Total Execution Time")
  tk("fields.total_wait_time", "Total Wait Time")
  tk("fields.backoff_time", "Backoff Retry Time")
  tk(
    "fields.backoff_time.desc",
    "The waiting time before retry when a query encounters errors that require a retry",
  )
  tk("fields.get_commit_ts_time", "Get Commit Ts Time")
  tk("fields.get_commit_ts_time.desc", " ") // @todo
  tk("fields.local_latch_wait_time", "Local Latch Wait Time")
  tk("fields.local_latch_wait_time.desc", " ") // @todo
  tk("fields.resolve_lock_time", "Resolve Lock Time")
  tk("fields.resolve_lock_time.desc", " ") // @todo
  tk("fields.prewrite_time", "Prewrite Time")
  tk("fields.commit_time", "Commit Time")
  tk("fields.commit_backoff_time", "Commit Backoff Retry Time")
  tk("fields.latency", "Query")
  tk("fields.query_time_2", "Query Time")
  tk(
    "fields.query_time_2.desc",
    "The execution time of a query (due to the parallel execution, it may be significantly smaller than the above time)",
  )
  tk("fields.sum_cop_task_num", "Total Coprocessor Tasks")
  tk("fields.sum_cop_task_num.desc", " ") // @todo
  tk("fields.avg_processed_keys", "Mean Visible Versions Per Query")
  tk("fields.max_processed_keys", "Max Visible Versions Per Query")
  tk("fields.avg_total_keys", "Mean Meet Versions Per Query")
  tk(
    "fields.avg_total_keys.desc",
    "Meet versions contains overwritten or deleted versions",
  )
  tk("fields.max_total_keys", "Max Meet Versions Per Query")
  tk("fields.avg_affected_rows", "Mean Affected Rows")
  tk("fields.sum_backoff_times", "Total Backoff Count")
  tk("fields.sum_backoff_times.desc", " ") // @todo
  tk("fields.avg_write_keys", "Mean Written Keys")
  tk("fields.max_write_keys", "Max Written Keys")
  tk("fields.avg_write_size", "Mean Written Data Size")
  tk("fields.max_write_size", "Max Written Data Size")
  tk("fields.avg_prewrite_regions", "Mean Prewrite Regions")
  tk("fields.max_prewrite_regions", "Max Prewrite Regions")
  tk("fields.avg_txn_retry", "Mean Transaction Retries")
  tk("fields.max_txn_retry", "Max Transaction Retries")
  tk("fields.digest", "Query Template ID")
  tk("fields.digest.desc", "a.k.a. Query digest")
  tk("fields.schema_name", "Execution Database")
  tk("fields.schema_name.desc", "The database used to execute the query")
  tk("fields.query_sample_text", "Query Sample")
  tk("fields.prev_sample_text", "Previous Query Sample")
  tk("fields.prev_sample_text.desc", " ") // @todo
  tk("fields.plan", "Execution Plan")
  tk(
    "fields.avg_rocksdb_delete_skipped_count",
    "Mean RocksDB Skipped Deletions",
  )
  tk(
    "fields.avg_rocksdb_delete_skipped_count.desc",
    "Total number of deleted (a.k.a. tombstone) key versions that are skipped during iteration (RocksDB delete_skipped_count)",
  )
  tk("fields.max_rocksdb_delete_skipped_count", "Max RocksDB Skipped Deletions")
  tk("fields.avg_rocksdb_key_skipped_count", "Mean RocksDB Skipped Keys")
  tk(
    "fields.avg_rocksdb_key_skipped_count.desc",
    "Total number of keys skipped during iteration (RocksDB key_skipped_count)",
  )
  tk("fields.max_rocksdb_key_skipped_count", "Max RocksDB Skipped Keys")
  tk(
    "fields.avg_rocksdb_block_cache_hit_count",
    "Mean RocksDB Block Cache Hits",
  )
  tk(
    "fields.avg_rocksdb_block_cache_hit_count.desc",
    "Total number of hits from the block cache (RocksDB block_cache_hit_count)",
  )
  tk("fields.max_rocksdb_block_cache_hit_count", "Max RocksDB Block Cache Hits")
  tk("fields.avg_rocksdb_block_read_count", "Mean RocksDB Block Reads")
  tk(
    "fields.avg_rocksdb_block_read_count.desc",
    "Total number of blocks RocksDB read from file (RocksDB block_read_count)",
  )
  tk("fields.max_rocksdb_block_read_count", "Max RocksDB Block Reads")
  tk("fields.avg_rocksdb_block_read_byte", "Mean RocksDB FS Read Size")
  tk(
    "fields.avg_rocksdb_block_read_byte.desc",
    "Total number of bytes RocksDB read from file (RocksDB block_read_byte)",
  )
  tk("fields.max_rocksdb_block_read_byte", "Max RocksDB FS Read Size")
  tk("fields.resource_group", "Resource Group")
  tk(
    "fields.resource_group.desc",
    "The resource group that the query belongs to",
  )
  tk("fields.avg_ru", "Mean RU")
  tk(
    "fields.avg_ru.desc",
    "The average number of request units (RU) consumed by the statement",
  )
  tk("fields.max_ru", "Max RU")
  tk(
    "fields.max_ru.desc",
    "The maximum number of request units (RU) consumed by the statement",
  )
  tk("fields.sum_ru", "Total RU")
  tk(
    "fields.sum_ru.desc",
    "The total number of request units (RU) consumed by the statement",
  )
  tk("fields.avg_time_queued_by_rc", "Mean RC Wait Time in Queue")
  tk(
    "fields.avg_time_queued_by_rc.desc",
    "The average time that the query waits in the resource control's queue (not a wall time)",
  )
  tk("fields.max_time_queued_by_rc", "Max RC Wait Time in Queue")
  tk(
    "fields.max_time_queued_by_rc.desc",
    "The maximum time that the query waits in the resource control's queue (not a wall time)",
  )
  tk("fields.rc_wait_time", "RC Wait Time")
  tk(
    "fields.rc_wait_time.desc",
    "The total wait time spent in the resource queue (note: {{distro.tikv}} executes requests in parallel so that this is not a wall time)",
  )

  // additional fields
  // @todo: refine translation
  tk("fields.max_latency", "Max Latency")
  tk("fields.min_latency", "Min Latency")
  tk("fields.avg_parse_latency", "Mean Parse Latency")
  tk("fields.max_parse_latency", "Max Parse Latency")
  tk("fields.avg_compile_latency", "Mean Compile Latency")
  tk("fields.max_compile_latency", "Max Compile Latency")
  tk("fields.max_cop_process_time", "Max Coprocess Time")
  tk("fields.max_cop_wait_time", "Max Coprocess Wait Time")
  tk("fields.avg_process_time", "Mean Process Time")
  tk("fields.max_process_time", "Max Process Time")
  tk("fields.avg_wait_time", "Mean Wait Time")
  tk("fields.max_wait_time", "Max Wait Time")
  tk("fields.avg_backoff_time", "Mean Backoff Time")
  tk("fields.max_backoff_time", "Max Backoff Time")
  tk("fields.avg_prewrite_time", "Mean Prewrite Time")
  tk("fields.max_prewrite_time", "Max Prewrite Time")
  tk("fields.avg_commit_time", "Mean Commit Time")
  tk("fields.max_commit_time", "Max Commit Time")
  tk("fields.avg_get_commit_ts_time", "Mean Get Commit Ts Time")
  tk("fields.max_get_commit_ts_time", "Max Get Commit Ts Time")
  tk("fields.avg_commit_backoff_time", "Mean Commit Backoff Time")
  tk("fields.max_commit_backoff_time", "Max Commit Backoff Time")
  tk("fields.avg_resolve_lock_time", "Mean Resolve Lock Time")
  tk("fields.max_resolve_lock_time", "Max Resolve Lock Time")
  tk("fields.avg_local_latch_wait_time", "Mean Local Latch Wait Time")
  tk("fields.max_local_latch_wait_time", "Max Local Latch Wait Time")
  tk("fields.stmt_type", "Statement Type")
  tk("fields.plan_hint", "Plan Hint")
  tk("fields.binary_plan", "Binary Plan")
}
