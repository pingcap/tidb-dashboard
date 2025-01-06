import {
  InfoModel,
  InfoTable,
} from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import {
  formatNumByUnit,
  useTn,
} from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { useMemo } from "react"

import { StatementModel } from "../../../models"

function getData(
  data: StatementModel,
  tk: (key: string) => string,
): InfoModel[] {
  return [
    {
      name: tk("fields.sum_cop_task_num"),
      value: formatNumByUnit(data.sum_cop_task_num ?? 0, "short"),
    },
    {
      name: tk("fields.avg_processed_keys"),
      value: formatNumByUnit(data.avg_processed_keys ?? 0, "short"),
    },
    {
      name: tk("fields.max_processed_keys"),
      value: formatNumByUnit(data.max_processed_keys ?? 0, "short"),
    },
    {
      name: tk("fields.avg_total_keys"),
      value: formatNumByUnit(data.avg_total_keys ?? 0, "short"),
      desc: tk("fields.avg_total_keys.desc"),
    },
    {
      name: tk("fields.max_total_keys"),
      value: formatNumByUnit(data.max_total_keys ?? 0, "short"),
    },
    {
      name: tk("fields.avg_rocksdb_block_cache_hit_count"),
      value: formatNumByUnit(
        data.avg_rocksdb_block_cache_hit_count ?? 0,
        "short",
      ),
      desc: tk("fields.avg_rocksdb_block_cache_hit_count.desc"),
    },
    {
      name: tk("fields.max_rocksdb_block_cache_hit_count"),
      value: formatNumByUnit(
        data.max_rocksdb_block_cache_hit_count ?? 0,
        "short",
      ),
    },
    {
      name: tk("fields.avg_rocksdb_block_read_byte"),
      value: formatNumByUnit(data.avg_rocksdb_block_read_byte ?? 0, "short"),
      desc: tk("fields.avg_rocksdb_block_read_byte.desc"),
    },
    {
      name: tk("fields.max_rocksdb_block_read_byte"),
      value: formatNumByUnit(data.max_rocksdb_block_read_byte ?? 0, "short"),
    },
    {
      name: tk("fields.avg_rocksdb_block_read_count"),
      value: formatNumByUnit(data.avg_rocksdb_block_read_count ?? 0, "short"),
      desc: tk("fields.avg_rocksdb_block_read_count.desc"),
    },
    {
      name: tk("fields.max_rocksdb_block_read_count"),
      value: formatNumByUnit(data.max_rocksdb_block_read_count ?? 0, "short"),
    },
    {
      name: tk("fields.avg_rocksdb_delete_skipped_count"),
      value: formatNumByUnit(
        data.avg_rocksdb_delete_skipped_count ?? 0,
        "short",
      ),
      desc: tk("fields.avg_rocksdb_delete_skipped_count.desc"),
    },
    {
      name: tk("fields.max_rocksdb_delete_skipped_count"),
      value: formatNumByUnit(
        data.max_rocksdb_delete_skipped_count ?? 0,
        "short",
      ),
    },
    {
      name: tk("fields.avg_rocksdb_key_skipped_count"),
      value: formatNumByUnit(data.avg_rocksdb_key_skipped_count ?? 0, "short"),
    },
    {
      name: tk("fields.max_rocksdb_key_skipped_count"),
      value: formatNumByUnit(data.max_rocksdb_key_skipped_count ?? 0, "short"),
    },
  ]
}

export function DetailCopr({ data }: { data: StatementModel }) {
  const { tk } = useTn("statement")
  const infoData = useMemo(() => getData(data, tk), [data, tk])
  return <InfoTable data={infoData} />
}
