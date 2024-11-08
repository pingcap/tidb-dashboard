/**
 *
 * @export
 * @interface SlowqueryModel
 */
export interface SlowqueryModel {
  /**
   *
   * @type {number}
   * @memberof SlowqueryModel
   */
  backoff_time?: number
  /**
   *
   * @type {string}
   * @memberof SlowqueryModel
   */
  backoff_types?: string
  /**
   *
   * @type {string}
   * @memberof SlowqueryModel
   */
  binary_plan?: string
  /**
   * Computed fields
   * @type {string}
   * @memberof SlowqueryModel
   */
  binary_plan_json?: string
  /**
   * binary plan plain text
   * @type {string}
   * @memberof SlowqueryModel
   */
  binary_plan_text?: string
  /**
   *
   * @type {number}
   * @memberof SlowqueryModel
   */
  commit_backoff_time?: number
  /**
   *
   * @type {number}
   * @memberof SlowqueryModel
   */
  commit_time?: number
  /**
   *
   * @type {number}
   * @memberof SlowqueryModel
   */
  compile_time?: number
  /**
   * TODO: Switch back to uint64 when modern browser as well as Swagger handles BigInt well.
   * @type {string}
   * @memberof SlowqueryModel
   */
  connection_id?: string
  /**
   *
   * @type {string}
   * @memberof SlowqueryModel
   */
  cop_proc_addr?: string
  /**
   *
   * @type {number}
   * @memberof SlowqueryModel
   */
  cop_proc_avg?: number
  /**
   *
   * @type {number}
   * @memberof SlowqueryModel
   */
  cop_proc_max?: number
  /**
   *
   * @type {number}
   * @memberof SlowqueryModel
   */
  cop_proc_p90?: number
  /**
   *
   * @type {number}
   * @memberof SlowqueryModel
   */
  cop_time?: number
  /**
   *
   * @type {string}
   * @memberof SlowqueryModel
   */
  cop_wait_addr?: string
  /**
   *
   * @type {number}
   * @memberof SlowqueryModel
   */
  cop_wait_avg?: number
  /**
   *
   * @type {number}
   * @memberof SlowqueryModel
   */
  cop_wait_max?: number
  /**
   *
   * @type {number}
   * @memberof SlowqueryModel
   */
  cop_wait_p90?: number
  /**
   *
   * @type {string}
   * @memberof SlowqueryModel
   */
  db?: string
  /**
   *
   * @type {string}
   * @memberof SlowqueryModel
   */
  digest?: string
  /**
   *
   * @type {number}
   * @memberof SlowqueryModel
   */
  disk_max?: number
  /**
   *
   * @type {number}
   * @memberof SlowqueryModel
   */
  exec_retry_time?: number
  /**
   *
   * @type {number}
   * @memberof SlowqueryModel
   */
  get_commit_ts_time?: number
  /**
   *
   * @type {string}
   * @memberof SlowqueryModel
   */
  host?: string
  /**
   *
   * @type {string}
   * @memberof SlowqueryModel
   */
  index_names?: string
  /**
   *
   * @type {string}
   * @memberof SlowqueryModel
   */
  instance?: string
  /**
   * Basic
   * @type {number}
   * @memberof SlowqueryModel
   */
  is_internal?: number
  /**
   *
   * @type {number}
   * @memberof SlowqueryModel
   */
  local_latch_wait_time?: number
  /**
   *
   * @type {number}
   * @memberof SlowqueryModel
   */
  lock_keys_time?: number
  /**
   *
   * @type {number}
   * @memberof SlowqueryModel
   */
  memory_max?: number
  /**
   *
   * @type {number}
   * @memberof SlowqueryModel
   */
  optimize_time?: number
  /**
   *
   * @type {number}
   * @memberof SlowqueryModel
   */
  parse_time?: number
  /**
   * deprecated, replaced by BinaryPlanText
   * @type {string}
   * @memberof SlowqueryModel
   */
  plan?: string
  /**
   *
   * @type {number}
   * @memberof SlowqueryModel
   */
  plan_from_binding?: number
  /**
   *
   * @type {number}
   * @memberof SlowqueryModel
   */
  plan_from_cache?: number
  /**
   *
   * @type {number}
   * @memberof SlowqueryModel
   */
  prepared?: number
  /**
   *
   * @type {number}
   * @memberof SlowqueryModel
   */
  preproc_subqueries_time?: number
  /**
   * Detail
   * @type {string}
   * @memberof SlowqueryModel
   */
  prev_stmt?: string
  /**
   *
   * @type {number}
   * @memberof SlowqueryModel
   */
  prewrite_region?: number
  /**
   *
   * @type {number}
   * @memberof SlowqueryModel
   */
  prewrite_time?: number
  /**
   *
   * @type {number}
   * @memberof SlowqueryModel
   */
  process_keys?: number
  /**
   * Time
   * @type {number}
   * @memberof SlowqueryModel
   */
  process_time?: number
  /**
   *
   * @type {string}
   * @memberof SlowqueryModel
   */
  query?: string
  /**
   * latency
   * @type {number}
   * @memberof SlowqueryModel
   */
  query_time?: number
  /**
   * Coprocessor
   * @type {number}
   * @memberof SlowqueryModel
   */
  request_count?: number
  /**
   *
   * @type {number}
   * @memberof SlowqueryModel
   */
  resolve_lock_time?: number
  /**
   *
   * @type {string}
   * @memberof SlowqueryModel
   */
  resource_group?: string
  /**
   *
   * @type {number}
   * @memberof SlowqueryModel
   */
  rewrite_time?: number
  /**
   *
   * @type {number}
   * @memberof SlowqueryModel
   */
  rocksdb_block_cache_hit_count?: number
  /**
   *
   * @type {number}
   * @memberof SlowqueryModel
   */
  rocksdb_block_read_byte?: number
  /**
   *
   * @type {number}
   * @memberof SlowqueryModel
   */
  rocksdb_block_read_count?: number
  /**
   * RocksDB
   * @type {number}
   * @memberof SlowqueryModel
   */
  rocksdb_delete_skipped_count?: number
  /**
   *
   * @type {number}
   * @memberof SlowqueryModel
   */
  rocksdb_key_skipped_count?: number
  /**
   * Resource Control
   * @type {number}
   * @memberof SlowqueryModel
   */
  ru?: number
  /**
   *
   * @type {string}
   * @memberof SlowqueryModel
   */
  stats?: string
  /**
   *
   * @type {number}
   * @memberof SlowqueryModel
   */
  success?: number
  /**
   *
   * @type {number}
   * @memberof SlowqueryModel
   */
  time_queued_by_rc?: number
  /**
   * finish time
   * @type {number}
   * @memberof SlowqueryModel
   */
  timestamp?: number
  /**
   *
   * @type {number}
   * @memberof SlowqueryModel
   */
  total_keys?: number
  /**
   *
   * @type {number}
   * @memberof SlowqueryModel
   */
  txn_retry?: number
  /**
   * TODO: Switch back to uint64 when modern browser as well as Swagger handles BigInt well.
   * @type {string}
   * @memberof SlowqueryModel
   */
  txn_start_ts?: string
  /**
   * Connection
   * @type {string}
   * @memberof SlowqueryModel
   */
  user?: string
  /**
   *
   * @type {number}
   * @memberof SlowqueryModel
   */
  wait_prewrite_binlog_time?: number
  /**
   *
   * @type {number}
   * @memberof SlowqueryModel
   */
  wait_time?: number
  /**
   *
   * @type {number}
   * @memberof SlowqueryModel
   */
  wait_ts?: number
  /**
   *
   * @type {Array<number>}
   * @memberof SlowqueryModel
   */
  warnings?: Array<string>
  /**
   * Transaction
   * @type {number}
   * @memberof SlowqueryModel
   */
  write_keys?: number
  /**
   *
   * @type {number}
   * @memberof SlowqueryModel
   */
  write_size?: number
  /**
   *
   * @type {number}
   * @memberof SlowqueryModel
   */
  write_sql_response_total?: number
}
