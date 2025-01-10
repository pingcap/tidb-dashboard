import {
  EvictedSQL,
  SQLWithHover,
} from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import { Trans, useTn } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { Box, Kbd, Typography, openConfirmModal } from "@tidbcloud/uikit"
import { useMemo } from "react"

import { TableColsFactory } from "../../../_shared/cols-factory"
import { useAppContext } from "../../ctx"
import { StatementModel } from "../../models"
import { useSelectedStatementState } from "../../url-state/memory-state"

const REMEMBER_KEY = "statement.press_ctrl_to_open_in_new_tab.tip.remember"

// @ts-expect-error @typescript-eslint/no-unused-vars
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function useLocales() {
  const { tt } = useTn("statement")
  // used for gogocode to scan and generate en.json before build
  tt(
    "When opening the detail page, you can press <kbd>Ctrl</kbd> or <kbd>⌘</kbd> to view it in a new tab, or <kbd>Shift</kbd> to view it in a new window.",
  )
}

function SqlCell({ row }: { row: StatementModel }) {
  const { tt } = useTn("statement")
  const ctx = useAppContext()
  const setSelectedStatement = useSelectedStatementState(
    (s) => s.setSelectedStatement,
  )

  function handleClick(ev: React.MouseEvent) {
    const { digest, schema_name, summary_begin_time, summary_end_time } = row
    const statementId = [digest, schema_name].join(",")
    setSelectedStatement(statementId)

    const newTab = ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.altKey
    // if the user don't press the ctrl/cmd/shift/alt and don't know this operation before
    // we should show a confirm dialog to tell the user this tip
    // after he know it, we won't show it again
    if (!newTab) {
      const remember = localStorage.getItem(REMEMBER_KEY)
      if (remember !== "true") {
        openConfirmModal({
          title: tt("Tips"),
          children: (
            <Typography>
              <Trans
                ns="dashboard-lib"
                i18nKey={
                  "statement.texts.When opening the detail page, you can press <kbd>Ctrl</kbd> or <kbd>⌘</kbd> to view it in a new tab, or <kbd>Shift</kbd> to view it in a new window."
                }
                components={{ kbd: <Kbd /> }}
              />
            </Typography>
          ),
          labels: {
            confirm: tt("I got it"),
            cancel: tt("Tell me again next time"),
          },
          onConfirm: () => {
            localStorage.setItem(REMEMBER_KEY, "true")
          },
        })
      }
    }

    const id = [summary_begin_time, summary_end_time, digest, schema_name].join(
      ",",
    )
    ctx.actions.openDetail(id, newTab)
  }

  return row.digest_text ? (
    <Box sx={{ cursor: "pointer" }} onClick={handleClick} w="100%">
      <SQLWithHover sql={row.digest_text} />
    </Box>
  ) : (
    <EvictedSQL />
  )
}

export function useListTableColumns() {
  const { tk } = useTn("statement")
  const columns = useMemo(() => {
    const tcf = new TableColsFactory<StatementModel>(tk)
    return tcf.columns([
      tcf.text("digest_text").patchConfig({
        minSize: 100,
        accessorFn: (row) => <SqlCell row={row} />,
      }),
      tcf.text("digest"),

      tcf.number("sum_latency", "ns"),
      tcf.number("avg_latency", "ns"),
      tcf.number("max_latency", "ns"),
      tcf.number("min_latency", "ns"),
      tcf.number("exec_count", "short"),

      tcf.number("plan_count", "short"),
      tcf.number("plan_cache_hits", "short"),

      tcf.number("avg_mem", "bytes"),
      tcf.number("max_mem", "bytes"),
      tcf.number("avg_disk", "bytes"),
      tcf.number("max_disk", "bytes"),

      tcf.number("sum_errors", "short"),
      tcf.number("sum_warnings", "short"),

      tcf.number("avg_parse_latency", "ns"),
      tcf.number("max_parse_latency", "ns"),
      tcf.number("avg_compile_latency", "ns"),
      tcf.number("max_compile_latency", "ns"),
      tcf.number("sum_cop_task_num", "short"),

      tcf.number("avg_cop_process_time", "ns"),
      tcf.number("max_cop_process_time", "ns"),
      tcf.number("avg_cop_wait_time", "ns"),
      tcf.number("max_cop_wait_time", "ns"),
      tcf.number("avg_process_time", "ns"),
      tcf.number("max_process_time", "ns"),
      tcf.number("avg_wait_time", "ns"),
      tcf.number("max_wait_time", "ns"),
      tcf.number("avg_backoff_time", "ns"),
      tcf.number("max_backoff_time", "ns"),
      tcf.number("avg_write_keys", "short"),
      tcf.number("max_write_keys", "short"),
      tcf.number("avg_processed_keys", "short"),
      tcf.number("max_processed_keys", "short"),
      tcf.number("avg_total_keys", "short"),
      tcf.number("max_total_keys", "short"),
      tcf.number("avg_prewrite_time", "ns"),
      tcf.number("max_prewrite_time", "ns"),
      tcf.number("avg_commit_time", "ns"),
      tcf.number("max_commit_time", "ns"),
      tcf.number("avg_get_commit_ts_time", "ns"),
      tcf.number("max_get_commit_ts_time", "ns"),
      tcf.number("avg_commit_backoff_time", "ns"),
      tcf.number("max_commit_backoff_time", "ns"),
      tcf.number("avg_resolve_lock_time", "ns"),
      tcf.number("max_resolve_lock_time", "ns"),
      tcf.number("avg_local_latch_wait_time", "ns"),
      tcf.number("max_local_latch_wait_time", "ns"),
      tcf.number("avg_write_size", "bytes"),
      tcf.number("max_write_size", "bytes"),
      tcf.number("avg_prewrite_regions", "short"),
      tcf.number("max_prewrite_regions", "short"),
      tcf.number("avg_txn_retry", "short"),
      tcf.number("max_txn_retry", "short"),

      tcf.number("sum_backoff_times", "short"),
      tcf.number("avg_affected_rows", "short"),

      tcf.timestamp("first_seen"),
      tcf.timestamp("last_seen"),
      tcf.text("sample_user"),
      tcf.text("schema_name"),
      tcf.text("table_names"),
      tcf.text("index_names"),
      tcf.text("plan_digest"),
      tcf.text("related_schemas"),

      tcf.number("avg_rocksdb_delete_skipped_count", "short"),
      tcf.number("max_rocksdb_delete_skipped_count", "short"),
      tcf.number("avg_rocksdb_key_skipped_count", "short"),
      tcf.number("max_rocksdb_key_skipped_count", "short"),
      tcf.number("avg_rocksdb_block_cache_hit_count", "short"),
      tcf.number("max_rocksdb_block_cache_hit_count", "short"),
      tcf.number("avg_rocksdb_block_read_count", "short"),
      tcf.number("max_rocksdb_block_read_count", "short"),
      tcf.number("avg_rocksdb_block_read_byte", "bytes"),
      tcf.number("max_rocksdb_block_read_byte", "bytes"),

      tcf.text("resource_group"),
      tcf.number("avg_ru", "short"),
      tcf.number("max_ru", "short"),
      tcf.number("avg_time_queued_by_rc", "ns"),
      tcf.number("max_time_queued_by_rc", "ns"),
    ])
  }, [tk])

  return columns
}
