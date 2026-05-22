/**
 * Type augmentation for fields returned by clinic's NGM proxy that aren't
 * part of the dashboard's own swagger spec.
 *
 * This file is NOT generated. Declarations here merge on top of the
 * interfaces generated into `./models.ts`, so any future re-generation of
 * the swagger client does NOT overwrite these fields.
 *
 * Background: clinic backend (PR pingcap-inc/clinic#1415) returns additional
 * RU V2 metrics on slow-query / sql-statement responses. The dashboard's own
 * Go API server does not yet model these fields, so the auto-generated
 * TypeScript model files don't declare them. This file fills the gap purely
 * on the TS side for the clinic-cloud deliverable.
 *
 * Visibility of these fields in the UI is independently gated by
 * `ISlowQueryConfig.showRuV2` / `IStatementConfig.showRuV2`, so other
 * deliverables (standalone TiDB dashboard, clinic-op) are unaffected.
 */
import '@lib/client'

declare module '@lib/client' {
  interface RequestUnitV2Metrics {
    total_ru?: number
    tidb_ru?: number
    tikv_ru?: number
    tiflash_ru?: number
    txn_cnt?: number
    plan_cnt?: number
    plan_derive_stats_paths?: number
    session_parser_total?: number
    executor_l1?: number
    executor_l2?: number
    executor_l3?: number
    executor_l5_insert_rows?: number
    result_chunk_cells?: number
    resource_manager_read_cnt?: number
    resource_manager_write_cnt?: number
    tikv_coprocessor_executor_iterations?: number
    tikv_coprocessor_response_bytes?: number
    tikv_coprocessor_executor_work_total?: Record<string, number>
    tikv_storage_processed_keys_get?: number
    tikv_storage_processed_keys_batch_get?: number
    tikv_kv_engine_cache_miss?: number
    tikv_raftstore_store_write_trigger_wb_bytes?: number
  }

  interface SlowqueryModel {
    ru_v2?: number
    ru_v2_detail?: string
    ru_v2_metrics?: RequestUnitV2Metrics
  }

  interface StatementModel {
    avg_ru_v2?: number
    sum_ru_v2?: number
    max_ru_v2?: number
  }
}
