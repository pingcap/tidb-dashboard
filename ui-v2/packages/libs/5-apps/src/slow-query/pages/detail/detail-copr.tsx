import { formatValue } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { useMemo } from "react"

import { InfoModel, InfoTable } from "../../components/info-table"
import { SlowqueryModel } from "../../models"

function getData(data: SlowqueryModel): InfoModel[] {
  return [
    {
      name: "Request Count",
      value: formatValue(data.request_count || 0, "short"),
    },
    {
      name: "Process Keys",
      value: formatValue(data.process_keys || 0, "short"),
    },
    {
      name: "Total Keys",
      value: formatValue(data.total_keys || 0, "short"),
    },
    {
      name: "Copr Address (Process)",
      value: data.cop_proc_addr || "-",
      description:
        "The address of the TiKV that takes most time process the Coprocessor request",
    },
    {
      name: "Copr Address (Wait)",
      value: data.cop_wait_addr || "-",
      description:
        "The address of the TiKV that takes most time wait the Coprocessor request",
    },
    {
      name: "RocksDB Block Cache Hits",
      value: formatValue(data.rocksdb_block_cache_hit_count || 0, "short"),
      description:
        "Total number of hits from the block cache (RocksDB block_cache_hit_count)",
    },
    {
      name: "RocksDB Read Size",
      value: formatValue(data.rocksdb_block_read_byte || 0, "bytes"),
      description:
        "Total number of bytes RocksDB read from file (RocksDB block_read_byte)",
    },
    {
      name: "RocksDB Block Reads",
      value: formatValue(data.rocksdb_block_read_count || 0, "short"),
      description:
        "Total number of blocks RocksDB read from file (RocksDB block_read_count)",
    },
    {
      name: "RocksDB Skipped Deletions",
      value: formatValue(data.rocksdb_delete_skipped_count || 0, "short"),
      description:
        "Total number of deleted (a.k.a. tombstone) key versions that are skipped during iteration (RocksDB delete_skipped_count)",
    },
    {
      name: "RocksDB Skipped Keys",
      value: formatValue(data.rocksdb_key_skipped_count || 0, "short"),
      description:
        "Total number of keys skipped during iteration (RocksDB key_skipped_count)",
    },
  ]
}

export function DetailCopr({ data }: { data: SlowqueryModel }) {
  const infoData = useMemo(() => getData(data), [data])
  return <InfoTable data={infoData} />
}
