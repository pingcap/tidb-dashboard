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
      name: tk("fields.query_time_2"),
      value: formatNumByUnit(data.query_time! * 10e8, "ns"),
      level: 0,
      desc: tk("fields.query_time_2.desc"),
    },
    {
      name: tk("fields.parse_time"),
      value: formatNumByUnit(data.parse_time! * 10e8, "ns"),
      level: 1,
      desc: tk("fields.parse_time.desc"),
    },
    {
      name: tk("fields.compile_time"),
      value: formatNumByUnit(data.compile_time! * 10e8, "ns"),
      level: 1,
      desc: "",
    },
    {
      name: tk("fields.rewrite_time"),
      value: formatNumByUnit(data.rewrite_time! * 10e8, "ns"),
      level: 2,
      desc: "",
    },
    {
      name: tk("fields.preproc_subqueries_time"),
      value: formatNumByUnit(data.preproc_subqueries_time! * 10e8, "ns"),
      level: 3,
      desc: tk("fields.preproc_subqueries_time.desc"),
    },
    {
      name: tk("fields.optimize_time"),
      value: formatNumByUnit(data.optimize_time! * 10e8, "ns"),
      level: 2,
      desc: tk("fields.optimize_time.desc"),
    },
    {
      name: tk("fields.cop_time"),
      value: formatNumByUnit(data.cop_time! * 10e8, "ns"),
      level: 1,
      desc: tk("fields.cop_time.desc"),
    },
    {
      name: tk("fields.wait_time"),
      value: formatNumByUnit(data.wait_time! * 10e8, "ns"),
      level: 2,
      desc: tk("fields.wait_time.desc"),
    },
    {
      name: tk("fields.process_time"),
      value: formatNumByUnit(data.process_time! * 10e8, "ns"),
      level: 2,
      desc: tk("fields.process_time.desc"),
    },
    {
      name: tk("fields.local_latch_wait_time"),
      value: formatNumByUnit(data.local_latch_wait_time! * 10e8, "ns"),
      level: 1,
      desc: tk("fields.local_latch_wait_time.desc"),
    },
    {
      name: tk("fields.lock_keys_time"),
      value: formatNumByUnit(data.lock_keys_time! * 10e8, "ns"),
      level: 1,
      desc: tk("fields.lock_keys_time.desc"),
    },
    {
      name: tk("fields.resolve_lock_time"),
      value: formatNumByUnit(data.resolve_lock_time! * 10e8, "ns"),
      level: 1,
      desc: tk("fields.resolve_lock_time.desc"),
    },
    {
      name: tk("fields.wait_ts"),
      value: formatNumByUnit(data.wait_ts! * 10e8, "ns"),
      level: 1,
      desc: tk("fields.wait_ts.desc"),
    },
    {
      name: tk("fields.get_commit_ts_time"),
      value: formatNumByUnit(data.get_commit_ts_time! * 10e8, "ns"),
      level: 1,
      desc: tk("fields.get_commit_ts_time.desc"),
    },
    {
      name: tk("fields.prewrite_time"),
      value: formatNumByUnit(data.prewrite_time! * 10e8, "ns"),
      level: 1,
      desc: tk("fields.prewrite_time.desc"),
    },
    {
      name: tk("fields.commit_time"),
      value: formatNumByUnit(data.commit_time! * 10e8, "ns"),
      level: 1,
      desc: tk("fields.commit_time.desc"),
    },
    {
      name: tk("fields.backoff_time"),
      value: formatNumByUnit(data.backoff_time! * 10e8, "ns"),
      level: 1,
      desc: tk("fields.backoff_time.desc"),
    },
    {
      name: tk("fields.commit_backoff_time"),
      value: formatNumByUnit(data.commit_backoff_time! * 10e8, "ns"),
      level: 1,
      desc: tk("fields.commit_backoff_time.desc"),
    },
    {
      name: tk("fields.exec_retry_time"),
      value: formatNumByUnit(data.exec_retry_time! * 10e8, "ns"),
      level: 1,
      desc: tk("fields.exec_retry_time.desc"),
    },
    {
      name: tk("fields.write_sql_response_total"),
      value: formatNumByUnit(data.write_sql_response_total! * 10e8, "ns"),
      level: 1,
      desc: tk("fields.write_sql_response_total.desc"),
    },
    {
      name: tk("fields.wait_prewrite_binlog_time"),
      value: formatNumByUnit(data.wait_prewrite_binlog_time! * 10e8, "ns"),
      level: 1,
      desc: tk("fields.wait_prewrite_binlog_time.desc"),
    },
  ]
}

export function DetailTime({ data }: { data: SlowqueryModel }) {
  const { tk } = useTn("slow-query")
  const infoData = useMemo(() => getData(data, tk), [data, tk])
  return <InfoTable data={infoData} />
}
