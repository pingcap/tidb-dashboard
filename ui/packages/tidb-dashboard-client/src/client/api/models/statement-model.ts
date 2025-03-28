/* tslint:disable */
/* eslint-disable */
/**
 * Dashboard API
 * No description provided (generated by Openapi Generator https://github.com/openapitools/openapi-generator)
 *
 * The version of the OpenAPI document: 1.0
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */



/**
 * 
 * @export
 * @interface StatementModel
 */
export interface StatementModel {
    /**
     * 
     * @type {number}
     * @memberof StatementModel
     */
    'avg_affected_rows'?: number;
    /**
     * avg total back off time per sql
     * @type {number}
     * @memberof StatementModel
     */
    'avg_backoff_time'?: number;
    /**
     * 
     * @type {number}
     * @memberof StatementModel
     */
    'avg_commit_backoff_time'?: number;
    /**
     * 
     * @type {number}
     * @memberof StatementModel
     */
    'avg_commit_time'?: number;
    /**
     * 
     * @type {number}
     * @memberof StatementModel
     */
    'avg_compile_latency'?: number;
    /**
     * avg process time per copr task
     * @type {number}
     * @memberof StatementModel
     */
    'avg_cop_process_time'?: number;
    /**
     * avg wait time per copr task
     * @type {number}
     * @memberof StatementModel
     */
    'avg_cop_wait_time'?: number;
    /**
     * 
     * @type {number}
     * @memberof StatementModel
     */
    'avg_disk'?: number;
    /**
     * 
     * @type {number}
     * @memberof StatementModel
     */
    'avg_get_commit_ts_time'?: number;
    /**
     * 
     * @type {number}
     * @memberof StatementModel
     */
    'avg_latency'?: number;
    /**
     * 
     * @type {number}
     * @memberof StatementModel
     */
    'avg_local_latch_wait_time'?: number;
    /**
     * 
     * @type {number}
     * @memberof StatementModel
     */
    'avg_mem'?: number;
    /**
     * 
     * @type {number}
     * @memberof StatementModel
     */
    'avg_parse_latency'?: number;
    /**
     * 
     * @type {number}
     * @memberof StatementModel
     */
    'avg_prewrite_regions'?: number;
    /**
     * 
     * @type {number}
     * @memberof StatementModel
     */
    'avg_prewrite_time'?: number;
    /**
     * avg total process time per sql
     * @type {number}
     * @memberof StatementModel
     */
    'avg_process_time'?: number;
    /**
     * 
     * @type {number}
     * @memberof StatementModel
     */
    'avg_processed_keys'?: number;
    /**
     * 
     * @type {number}
     * @memberof StatementModel
     */
    'avg_resolve_lock_time'?: number;
    /**
     * 
     * @type {number}
     * @memberof StatementModel
     */
    'avg_rocksdb_block_cache_hit_count'?: number;
    /**
     * 
     * @type {number}
     * @memberof StatementModel
     */
    'avg_rocksdb_block_read_byte'?: number;
    /**
     * 
     * @type {number}
     * @memberof StatementModel
     */
    'avg_rocksdb_block_read_count'?: number;
    /**
     * 
     * @type {number}
     * @memberof StatementModel
     */
    'avg_rocksdb_delete_skipped_count'?: number;
    /**
     * 
     * @type {number}
     * @memberof StatementModel
     */
    'avg_rocksdb_key_skipped_count'?: number;
    /**
     * 
     * @type {number}
     * @memberof StatementModel
     */
    'avg_ru'?: number;
    /**
     * 
     * @type {number}
     * @memberof StatementModel
     */
    'avg_time_queued_by_rc'?: number;
    /**
     * 
     * @type {number}
     * @memberof StatementModel
     */
    'avg_total_keys'?: number;
    /**
     * 
     * @type {number}
     * @memberof StatementModel
     */
    'avg_txn_retry'?: number;
    /**
     * avg total wait time per sql
     * @type {number}
     * @memberof StatementModel
     */
    'avg_wait_time'?: number;
    /**
     * 
     * @type {number}
     * @memberof StatementModel
     */
    'avg_write_keys'?: number;
    /**
     * 
     * @type {number}
     * @memberof StatementModel
     */
    'avg_write_size'?: number;
    /**
     * 
     * @type {string}
     * @memberof StatementModel
     */
    'binary_plan'?: string;
    /**
     * 
     * @type {string}
     * @memberof StatementModel
     */
    'binary_plan_json'?: string;
    /**
     * 
     * @type {string}
     * @memberof StatementModel
     */
    'binary_plan_text'?: string;
    /**
     * 
     * @type {string}
     * @memberof StatementModel
     */
    'digest'?: string;
    /**
     * 
     * @type {string}
     * @memberof StatementModel
     */
    'digest_text'?: string;
    /**
     * 
     * @type {number}
     * @memberof StatementModel
     */
    'exec_count'?: number;
    /**
     * 
     * @type {number}
     * @memberof StatementModel
     */
    'first_seen'?: number;
    /**
     * 
     * @type {string}
     * @memberof StatementModel
     */
    'index_names'?: string;
    /**
     * 
     * @type {number}
     * @memberof StatementModel
     */
    'last_seen'?: number;
    /**
     * max back off time per sql
     * @type {number}
     * @memberof StatementModel
     */
    'max_backoff_time'?: number;
    /**
     * 
     * @type {number}
     * @memberof StatementModel
     */
    'max_commit_backoff_time'?: number;
    /**
     * 
     * @type {number}
     * @memberof StatementModel
     */
    'max_commit_time'?: number;
    /**
     * 
     * @type {number}
     * @memberof StatementModel
     */
    'max_compile_latency'?: number;
    /**
     * max process time per copr task
     * @type {number}
     * @memberof StatementModel
     */
    'max_cop_process_time'?: number;
    /**
     * max wait time per copr task
     * @type {number}
     * @memberof StatementModel
     */
    'max_cop_wait_time'?: number;
    /**
     * 
     * @type {number}
     * @memberof StatementModel
     */
    'max_disk'?: number;
    /**
     * 
     * @type {number}
     * @memberof StatementModel
     */
    'max_get_commit_ts_time'?: number;
    /**
     * 
     * @type {number}
     * @memberof StatementModel
     */
    'max_latency'?: number;
    /**
     * 
     * @type {number}
     * @memberof StatementModel
     */
    'max_local_latch_wait_time'?: number;
    /**
     * 
     * @type {number}
     * @memberof StatementModel
     */
    'max_mem'?: number;
    /**
     * 
     * @type {number}
     * @memberof StatementModel
     */
    'max_parse_latency'?: number;
    /**
     * 
     * @type {number}
     * @memberof StatementModel
     */
    'max_prewrite_regions'?: number;
    /**
     * 
     * @type {number}
     * @memberof StatementModel
     */
    'max_prewrite_time'?: number;
    /**
     * max process time per sql
     * @type {number}
     * @memberof StatementModel
     */
    'max_process_time'?: number;
    /**
     * 
     * @type {number}
     * @memberof StatementModel
     */
    'max_processed_keys'?: number;
    /**
     * 
     * @type {number}
     * @memberof StatementModel
     */
    'max_resolve_lock_time'?: number;
    /**
     * 
     * @type {number}
     * @memberof StatementModel
     */
    'max_rocksdb_block_cache_hit_count'?: number;
    /**
     * 
     * @type {number}
     * @memberof StatementModel
     */
    'max_rocksdb_block_read_byte'?: number;
    /**
     * 
     * @type {number}
     * @memberof StatementModel
     */
    'max_rocksdb_block_read_count'?: number;
    /**
     * RocksDB
     * @type {number}
     * @memberof StatementModel
     */
    'max_rocksdb_delete_skipped_count'?: number;
    /**
     * 
     * @type {number}
     * @memberof StatementModel
     */
    'max_rocksdb_key_skipped_count'?: number;
    /**
     * 
     * @type {number}
     * @memberof StatementModel
     */
    'max_ru'?: number;
    /**
     * 
     * @type {number}
     * @memberof StatementModel
     */
    'max_time_queued_by_rc'?: number;
    /**
     * 
     * @type {number}
     * @memberof StatementModel
     */
    'max_total_keys'?: number;
    /**
     * 
     * @type {number}
     * @memberof StatementModel
     */
    'max_txn_retry'?: number;
    /**
     * max wait time per sql
     * @type {number}
     * @memberof StatementModel
     */
    'max_wait_time'?: number;
    /**
     * 
     * @type {number}
     * @memberof StatementModel
     */
    'max_write_keys'?: number;
    /**
     * 
     * @type {number}
     * @memberof StatementModel
     */
    'max_write_size'?: number;
    /**
     * 
     * @type {number}
     * @memberof StatementModel
     */
    'min_latency'?: number;
    /**
     * deprecated, replaced by BinaryPlanText
     * @type {string}
     * @memberof StatementModel
     */
    'plan'?: string;
    /**
     * 
     * @type {number}
     * @memberof StatementModel
     */
    'plan_cache_hits'?: number;
    /**
     * 
     * @type {boolean}
     * @memberof StatementModel
     */
    'plan_can_be_bound'?: boolean;
    /**
     * 
     * @type {number}
     * @memberof StatementModel
     */
    'plan_count'?: number;
    /**
     * 
     * @type {string}
     * @memberof StatementModel
     */
    'plan_digest'?: string;
    /**
     * 
     * @type {string}
     * @memberof StatementModel
     */
    'plan_hint'?: string;
    /**
     * 
     * @type {string}
     * @memberof StatementModel
     */
    'prev_sample_text'?: string;
    /**
     * 
     * @type {string}
     * @memberof StatementModel
     */
    'query_sample_text'?: string;
    /**
     * Computed fields
     * @type {string}
     * @memberof StatementModel
     */
    'related_schemas'?: string;
    /**
     * Resource Control
     * @type {string}
     * @memberof StatementModel
     */
    'resource_group'?: string;
    /**
     * 
     * @type {string}
     * @memberof StatementModel
     */
    'sample_user'?: string;
    /**
     * 
     * @type {string}
     * @memberof StatementModel
     */
    'schema_name'?: string;
    /**
     * 
     * @type {string}
     * @memberof StatementModel
     */
    'stmt_type'?: string;
    /**
     * 
     * @type {number}
     * @memberof StatementModel
     */
    'sum_backoff_times'?: number;
    /**
     * 
     * @type {number}
     * @memberof StatementModel
     */
    'sum_cop_task_num'?: number;
    /**
     * 
     * @type {number}
     * @memberof StatementModel
     */
    'sum_errors'?: number;
    /**
     * 
     * @type {number}
     * @memberof StatementModel
     */
    'sum_latency'?: number;
    /**
     * 
     * @type {number}
     * @memberof StatementModel
     */
    'sum_ru'?: number;
    /**
     * 
     * @type {number}
     * @memberof StatementModel
     */
    'sum_unpacked_bytes_received_tiflash_cross_zone'?: number;
    /**
     * 
     * @type {number}
     * @memberof StatementModel
     */
    'sum_unpacked_bytes_received_tiflash_total'?: number;
    /**
     * 
     * @type {number}
     * @memberof StatementModel
     */
    'sum_unpacked_bytes_received_tikv_cross_zone'?: number;
    /**
     * 
     * @type {number}
     * @memberof StatementModel
     */
    'sum_unpacked_bytes_received_tikv_total'?: number;
    /**
     * 
     * @type {number}
     * @memberof StatementModel
     */
    'sum_unpacked_bytes_sent_tiflash_cross_zone'?: number;
    /**
     * 
     * @type {number}
     * @memberof StatementModel
     */
    'sum_unpacked_bytes_sent_tiflash_total'?: number;
    /**
     * 
     * @type {number}
     * @memberof StatementModel
     */
    'sum_unpacked_bytes_sent_tikv_cross_zone'?: number;
    /**
     * Network Fields
     * @type {number}
     * @memberof StatementModel
     */
    'sum_unpacked_bytes_sent_tikv_total'?: number;
    /**
     * 
     * @type {number}
     * @memberof StatementModel
     */
    'sum_warnings'?: number;
    /**
     * 
     * @type {number}
     * @memberof StatementModel
     */
    'summary_begin_time'?: number;
    /**
     * 
     * @type {number}
     * @memberof StatementModel
     */
    'summary_end_time'?: number;
    /**
     * 
     * @type {string}
     * @memberof StatementModel
     */
    'table_names'?: string;
}

