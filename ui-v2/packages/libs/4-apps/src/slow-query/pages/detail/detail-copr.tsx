import {
  InfoModel,
  InfoTable,
} from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import {
  formatNumByUnit,
  useTn,
} from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { useMemo } from "react"

import { SlowqueryModel } from "../../models"

function getData(
  data: SlowqueryModel,
  tk: (key: string) => string,
): InfoModel[] {
  return [
    {
      name: tk("fields.request_count"),
      value: formatNumByUnit(data.request_count || 0, "short"),
    },
    {
      name: tk("fields.process_keys"),
      value: formatNumByUnit(data.process_keys || 0, "short"),
    },
    {
      name: tk("fields.total_keys"),
      value: formatNumByUnit(data.total_keys || 0, "short"),
    },
    {
      name: tk("fields.cop_proc_addr"),
      value: data.cop_proc_addr || "-",
      desc: tk("fields.cop_proc_addr.desc"),
    },
    {
      name: tk("fields.cop_wait_addr"),
      value: data.cop_wait_addr || "-",
      desc: tk("fields.cop_wait_addr.desc"),
    },
    {
      name: tk("fields.rocksdb_block_cache_hit_count"),
      value: formatNumByUnit(data.rocksdb_block_cache_hit_count || 0, "short"),
      desc: tk("fields.rocksdb_block_cache_hit_count.desc"),
    },
    {
      name: tk("fields.rocksdb_block_read_byte"),
      value: formatNumByUnit(data.rocksdb_block_read_byte || 0, "bytes"),
      desc: tk("fields.rocksdb_block_read_byte.desc"),
    },
    {
      name: tk("fields.rocksdb_block_read_count"),
      value: formatNumByUnit(data.rocksdb_block_read_count || 0, "short"),
      desc: tk("fields.rocksdb_block_read_count.desc"),
    },
    {
      name: tk("fields.rocksdb_delete_skipped_count"),
      value: formatNumByUnit(data.rocksdb_delete_skipped_count || 0, "short"),
      desc: tk("fields.rocksdb_delete_skipped_count.desc"),
    },
    {
      name: tk("fields.rocksdb_key_skipped_count"),
      value: formatNumByUnit(data.rocksdb_key_skipped_count || 0, "short"),
      desc: tk("fields.rocksdb_key_skipped_count.desc"),
    },
  ]
}

export function DetailCopr({ data }: { data: SlowqueryModel }) {
  const { tk } = useTn("slow-query")
  const infoData = useMemo(() => getData(data, tk), [data, tk])
  return <InfoTable data={infoData} />
}
