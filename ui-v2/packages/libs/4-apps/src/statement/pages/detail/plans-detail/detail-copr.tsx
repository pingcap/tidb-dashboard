import {
  InfoModel,
  InfoTable,
} from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import { formatValue } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { useMemo } from "react"

import { StatementModel } from "../../../models"

function getData(data: StatementModel): InfoModel[] {
  return [
    {
      name: "Total Coprocessor Tasks",
      value: formatValue(data.sum_cop_task_num ?? 0, "short"),
    },
    {
      name: "Mean Visible Versions Per Query",
      value: formatValue(data.avg_processed_keys ?? 0, "short"),
    },
    {
      name: "Max Visible Versions Per Query",
      value: formatValue(data.max_processed_keys ?? 0, "short"),
    },
    {
      name: "Mean Meet Versions Per Query",
      value: formatValue(data.avg_total_keys ?? 0, "short"),
      desc: "Meet versions contains overwritten or deleted versions",
    },
    {
      name: "Max Meet Versions Per Query",
      value: formatValue(data.max_total_keys ?? 0, "short"),
    },
    {
      name: "Mean RocksDB Block Cache Hits",
      value: formatValue(data.avg_rocksdb_block_cache_hit_count ?? 0, "short"),
      desc: "Total number of hits from the block cache (RocksDB block_cache_hit_count)",
    },
    {
      name: "Max RocksDB Block Cache Hits",
      value: formatValue(data.max_rocksdb_block_cache_hit_count ?? 0, "short"),
    },
    {
      name: "Mean RocksDB FS Read Size",
      value: formatValue(data.avg_rocksdb_block_read_byte ?? 0, "short"),
      desc: "Total number of bytes RocksDB read from file (RocksDB block_read_byte)",
    },
    {
      name: "Max RocksDB FS Read Size",
      value: formatValue(data.max_rocksdb_block_read_byte ?? 0, "short"),
    },
    {
      name: "Mean RocksDB Block Reads",
      value: formatValue(data.avg_rocksdb_block_read_count ?? 0, "short"),
      desc: "Total number of blocks RocksDB read from file (RocksDB block_read_count)",
    },
    {
      name: "Max RocksDB Block Reads",
      value: formatValue(data.max_rocksdb_block_read_count ?? 0, "short"),
    },
    {
      name: "Mean RocksDB Skipped Deletions",
      value: formatValue(data.avg_rocksdb_delete_skipped_count ?? 0, "short"),
      desc: "Total number of deleted (a.k.a. tombstone) key versions that are skipped during iteration (RocksDB delete_skipped_count)",
    },
    {
      name: "Max RocksDB Skipped Deletions",
      value: formatValue(data.max_rocksdb_delete_skipped_count ?? 0, "short"),
    },
    {
      name: "Mean RocksDB Skipped Keys",
      value: formatValue(data.avg_rocksdb_key_skipped_count ?? 0, "short"),
      desc: "Total number of keys skipped during iteration (RocksDB key_skipped_count)",
    },
    {
      name: "Max RocksDB Skipped Keys",
      value: formatValue(data.max_rocksdb_key_skipped_count ?? 0, "short"),
    },
  ]
}

export function DetailCopr({ data }: { data: StatementModel }) {
  const infoData = useMemo(() => getData(data), [data])
  return <InfoTable data={infoData} />
}
