/*!40101 SET NAMES binary*/;
/*T![placement] SET PLACEMENT_CHECKS = 0*/;
CREATE TABLE `CLUSTER_SLOW_QUERY` (`INSTANCE` VARCHAR(64) DEFAULT NULL, `Warning` VARCHAR(64) DEFAULT NULL, `BINARY_PLAN` VARCHAR(128) DEFAULT NULL,`Time` TIMESTAMP(6) NOT NULL,`Txn_start_ts` BIGINT(20) UNSIGNED DEFAULT NULL,`User` VARCHAR(64) DEFAULT NULL,`Host` VARCHAR(64) DEFAULT NULL,`Conn_ID` BIGINT(20) UNSIGNED DEFAULT NULL,`Exec_retry_count` BIGINT(20) UNSIGNED DEFAULT NULL,`Exec_retry_time` DOUBLE DEFAULT NULL,`Query_time` DOUBLE DEFAULT NULL,`Parse_time` DOUBLE DEFAULT NULL,`Compile_time` DOUBLE DEFAULT NULL,`Rewrite_time` DOUBLE DEFAULT NULL,`Preproc_subqueries` BIGINT(20) UNSIGNED DEFAULT NULL,`Preproc_subqueries_time` DOUBLE DEFAULT NULL,`Optimize_time` DOUBLE DEFAULT NULL,`Wait_TS` DOUBLE DEFAULT NULL,`Prewrite_time` DOUBLE DEFAULT NULL,`Wait_prewrite_binlog_time` DOUBLE DEFAULT NULL,`Commit_time` DOUBLE DEFAULT NULL,`Get_commit_ts_time` DOUBLE DEFAULT NULL,`Commit_backoff_time` DOUBLE DEFAULT NULL,`Backoff_types` VARCHAR(64) DEFAULT NULL,`Resolve_lock_time` DOUBLE DEFAULT NULL,`Local_latch_wait_time` DOUBLE DEFAULT NULL,`Write_keys` BIGINT(22) DEFAULT NULL,`Write_size` BIGINT(22) DEFAULT NULL,`Prewrite_region` BIGINT(22) DEFAULT NULL,`Txn_retry` BIGINT(22) DEFAULT NULL,`Cop_time` DOUBLE DEFAULT NULL,`Process_time` DOUBLE DEFAULT NULL,`Wait_time` DOUBLE DEFAULT NULL,`Backoff_time` DOUBLE DEFAULT NULL,`LockKeys_time` DOUBLE DEFAULT NULL,`Request_count` BIGINT(20) UNSIGNED DEFAULT NULL,`Total_keys` BIGINT(20) UNSIGNED DEFAULT NULL,`Process_keys` BIGINT(20) UNSIGNED DEFAULT NULL,`Rocksdb_delete_skipped_count` BIGINT(20) UNSIGNED DEFAULT NULL,`Rocksdb_key_skipped_count` BIGINT(20) UNSIGNED DEFAULT NULL,`Rocksdb_block_cache_hit_count` BIGINT(20) UNSIGNED DEFAULT NULL,`Rocksdb_block_read_count` BIGINT(20) UNSIGNED DEFAULT NULL,`Rocksdb_block_read_byte` BIGINT(20) UNSIGNED DEFAULT NULL,`DB` VARCHAR(64) DEFAULT NULL,`Index_names` VARCHAR(100) DEFAULT NULL,`Is_internal` TINYINT(1) DEFAULT NULL,`Digest` VARCHAR(64) DEFAULT NULL,`Stats` VARCHAR(512) DEFAULT NULL,`Cop_proc_avg` DOUBLE DEFAULT NULL,`Cop_proc_p90` DOUBLE DEFAULT NULL,`Cop_proc_max` DOUBLE DEFAULT NULL,`Cop_proc_addr` VARCHAR(64) DEFAULT NULL,`Cop_wait_avg` DOUBLE DEFAULT NULL,`Cop_wait_p90` DOUBLE DEFAULT NULL,`Cop_wait_max` DOUBLE DEFAULT NULL,`Cop_wait_addr` VARCHAR(64) DEFAULT NULL,`Mem_max` BIGINT(20) DEFAULT NULL,`Disk_max` BIGINT(20) DEFAULT NULL,`KV_total` DOUBLE DEFAULT NULL,`PD_total` DOUBLE DEFAULT NULL,`Backoff_total` DOUBLE DEFAULT NULL,`Write_sql_response_total` DOUBLE DEFAULT NULL,`Result_rows` BIGINT(22) DEFAULT NULL,`Backoff_Detail` VARCHAR(4096) DEFAULT NULL,`Prepared` TINYINT(1) DEFAULT NULL,`Succ` TINYINT(1) DEFAULT NULL,`IsExplicitTxn` TINYINT(1) DEFAULT NULL,`IsWriteCacheTable` TINYINT(1) DEFAULT NULL,`Plan_from_cache` TINYINT(1) DEFAULT NULL,`Plan_from_binding` TINYINT(1) DEFAULT NULL,`Plan` LONGTEXT DEFAULT NULL,`Plan_digest` VARCHAR(128) DEFAULT NULL,`Prev_stmt` LONGTEXT DEFAULT NULL,`Query` LONGTEXT DEFAULT NULL,PRIMARY KEY(`Time`) /*T![clustered_index] CLUSTERED */) ENGINE = InnoDB DEFAULT CHARACTER SET = UTF8MB4 DEFAULT COLLATE = UTF8MB4_BIN;
