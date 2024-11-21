import {
  InfoModel,
  InfoTable,
} from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import { formatNumByUnit } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { useMemo } from "react"

import { SlowqueryModel } from "../../models"

function getData(data: SlowqueryModel): InfoModel[] {
  return [
    {
      name: "Query Time",
      value: formatNumByUnit(data.query_time! * 10e8, "ns"),
      level: 0,
      desc: "The elapsed wall time when execution the query",
    },
    {
      name: "Parse Time",
      value: formatNumByUnit(data.parse_time! * 10e8, "ns"),
      level: 1,
      desc: "Time consumed when parsing the query",
    },
    {
      name: "Generate Plan Time",
      value: formatNumByUnit(data.compile_time! * 10e8, "ns"),
      level: 1,
      desc: "",
    },
    {
      name: "Rewrite Plan Time",
      value: formatNumByUnit(data.rewrite_time! * 10e8, "ns"),
      level: 2,
      desc: "",
    },
    {
      name: "Preprocess Sub-Query Time",
      value: formatNumByUnit(data.preproc_subqueries_time! * 10e8, "ns"),
      level: 3,
      desc: "Time consumed when pre-processing the subquery during the rewrite plan phase",
    },
    {
      name: "Optimize Plan Time",
      value: formatNumByUnit(data.optimize_time! * 10e8, "ns"),
      level: 2,
    },
    {
      name: "Coprocessor Executor Time",
      value: formatNumByUnit(data.cop_time! * 10e8, "ns"),
      level: 1,
      desc: "The elapsed wall time when TiDB Coprocessor executor waiting all Coprocessor requests to finish (note: when there are JOIN in SQL statement, multiple TiDB Coprocessor executors may be running in parallel, which may cause this time not being a wall time)",
    },
    {
      name: "Coprocessor Wait Time",
      value: formatNumByUnit(data.wait_time! * 10e8, "ns"),
      level: 2,
      desc: "The total time of Coprocessor request is prepared and wait to execute in TiKV, which may happen when retrieving a snapshot though Raft concensus protocol (note: TiKV waits requests in parallel so that this is not a wall time)",
    },
    {
      name: "Coprocessor Process Time",
      value: formatNumByUnit(data.process_time! * 10e8, "ns"),
      level: 2,
      desc: "The total time of Coprocessor request being executed in TiKV (note: TiKV executes requests in parallel so that this is not a wall time)",
    },
    {
      name: "Local Latch Wait Time",
      value: formatNumByUnit(data.local_latch_wait_time! * 10e8, "ns"),
      level: 1,
      desc: "Time consumed when TiDB waits for the lock in the current TiDB instance before 2PC commit phase when transaction commits",
    },
    {
      name: "Lock Keys Time",
      value: formatNumByUnit(data.lock_keys_time! * 10e8, "ns"),
      level: 1,
      desc: "Time consumed when locking keys in pessimistic transaction",
    },
    {
      name: "Resolve Lock Time",
      value: formatNumByUnit(data.resolve_lock_time! * 10e8, "ns"),
      level: 1,
      desc: "Time consumed when TiDB resolves locks from other transactions in 2PC prewrite phase when transaction commits",
    },
    {
      name: "Get Start Ts Time",
      value: formatNumByUnit(data.wait_ts! * 10e8, "ns"),
      level: 1,
      desc: "Time consumed when getting a start timestamp when transaction begins",
    },
    {
      name: "Get Commit Ts Time",
      value: formatNumByUnit(data.get_commit_ts_time! * 10e8, "ns"),
      level: 1,
      desc: "Time consumed when getting a commit timestamp for 2PC commit phase when transaction commits",
    },
    {
      name: "Prewrite Time",
      value: formatNumByUnit(data.prewrite_time! * 10e8, "ns"),
      level: 1,
      desc: "Time consumed in 2PC prewrite phase when transaction commits",
    },
    {
      name: "Commit Time",
      value: formatNumByUnit(data.commit_time! * 10e8, "ns"),
      level: 1,
      desc: "Time consumed in 2PC commit phase when transaction commits",
    },
    {
      name: "Execution Backoff Time",
      value: formatNumByUnit(data.backoff_time! * 10e8, "ns"),
      level: 1,
      desc: "The total backoff waiting time before retry when a query encounters errors (note: there may be multiple backoffs in parallel so that this may not be a wall time)",
    },
    {
      name: "Commit Backoff Time",
      value: formatNumByUnit(data.commit_backoff_time! * 10e8, "ns"),
      level: 1,
      desc: "The total backoff waiting time when 2PC commit encounters errors (note: there may be multiple backoffs in parallel so that this may not be a wall time)",
    },
    {
      name: "Retried execution Time",
      value: formatNumByUnit(data.exec_retry_time! * 10e8, "ns"),
      level: 1,
      desc: "Wall time consumed when SQL statement is retried and executed again, except for the last exection",
    },
    {
      name: "Send response Time",
      value: formatNumByUnit(data.write_sql_response_total! * 10e8, "ns"),
      level: 1,
      desc: "Time consumed when sending response to the SQL client",
    },
    {
      name: "Wait Binlog Prewrite Time",
      value: formatNumByUnit(data.wait_prewrite_binlog_time! * 10e8, "ns"),
      level: 1,
      desc: "Time consumed when waiting Binlog prewrite to finish",
    },
  ]
}

export function DetailTime({ data }: { data: SlowqueryModel }) {
  const infoData = useMemo(() => getData(data), [data])
  return <InfoTable data={infoData} />
}
