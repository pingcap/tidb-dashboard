import {
  InfoModel,
  InfoTable,
} from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import {
  formatNumByUnit,
  formatTime,
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
      name: tk("fields.timestamp"),
      value: formatTime(data.timestamp! * 1000),
      desc: tk("fields.timestamp.desc"),
    },
    {
      name: tk("fields.digest"),
      value: data.digest!,
      desc: tk("fields.digest.desc"),
    },
    {
      name: tk("fields.is_internal"),
      value: data.is_internal === 1 ? "Yes" : "No",
      desc: tk("fields.is_internal.desc"),
    },
    {
      name: tk("fields.success"),
      value: data.success === 1 ? "Yes" : "No",
      desc: tk("fields.success.desc"),
    },
    {
      name: tk("fields.prepared"),
      value: data.prepared === 1 ? "Yes" : "No",
      desc: tk("fields.prepared.desc"),
    },
    {
      name: tk("fields.plan_from_cache"),
      value: data.plan_from_cache === 1 ? "Yes" : "No",
    },
    {
      name: tk("fields.plan_from_binding"),
      value: data.plan_from_binding === 1 ? "Yes" : "No",
    },
    {
      name: tk("fields.db"),
      value: data.db || "-",
      desc: tk("fields.db.desc"),
    },
    {
      name: tk("fields.index_names"),
      value: data.index_names || "-",
      desc: tk("fields.index_names.desc"),
    },
    {
      name: tk("fields.stats"),
      value: data.stats || "-",
    },
    {
      name: tk("fields.backoff_types"),
      value: data.backoff_types || "-",
    },
    {
      name: tk("fields.memory_max"),
      value: formatNumByUnit(data.memory_max || 0, "bytes"),
      desc: tk("fields.memory_max.desc"),
    },
    {
      name: tk("fields.disk_max"),
      value: formatNumByUnit(data.disk_max || 0, "bytes"),
      desc: tk("fields.disk_max.desc"),
    },
    {
      name: tk("fields.instance"),
      value: data.instance || "-",
      desc: tk("fields.instance.desc"),
    },
    {
      name: tk("fields.connection_id"),
      value: data.connection_id || "-",
      desc: tk("fields.connection_id.desc"),
    },
    {
      name: tk("fields.user"),
      value: data.user || "-",
      desc: tk("fields.user.desc"),
    },
    {
      name: tk("fields.host"),
      value: data.host || "-",
      desc: tk("fields.host.desc"),
    },
  ]
}

export function DetailBasic({ data }: { data: SlowqueryModel }) {
  const { tk } = useTn("slow-query")
  const infoData = useMemo(() => getData(data, tk), [data, tk])
  return <InfoTable data={infoData} />
}
