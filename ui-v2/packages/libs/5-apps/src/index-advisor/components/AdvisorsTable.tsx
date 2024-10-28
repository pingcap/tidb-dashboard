import {
  LabelTooltip,
  MRT_ColumnDef,
  MantineReactTableProps,
} from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import { ProTable } from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import { IconDotsHorizontal } from "@pingcap-incubator/tidb-dashboard-lib-icons"
import {
  ActionIcon,
  Box,
  Group,
  Menu,
  Tooltip,
  Typography,
} from "@pingcap-incubator/tidb-dashboard-lib-primitive-ui"
import { capitalize } from "lodash-es"
import { useCallback, useMemo } from "react"

// import TimeComponent from 'dbaas/components/TimeComponent'

import { useIndexAdvisorUrlState } from "../url-state/list-url-state"
import { IndexAdvisorItem } from "../utils/type"
import { useAdvisorsData } from "../utils/use-data"

import { AdvisorDetailDrawer } from "./AdvisorDetailDrawer"
import AdvisorStatusIndicator from "./AdvisorStatusIndicator"
import { ApplyModal } from "./ApplyModal"
import { CloseModal } from "./CloseModal"

function ActionMenuButton({ advisor }: { advisor: IndexAdvisorItem }) {
  const { setApplyId, setCloseId } = useIndexAdvisorUrlState()

  return (
    <Menu shadow="md" width={160} withinPortal>
      <Menu.Target>
        <ActionIcon variant="default" size={32}>
          <IconDotsHorizontal size={16} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item
          data-mp-event="IndexAdvisor Apply Action Button Clicked"
          onClick={() => setApplyId(advisor.id)}
        >
          Apply
        </Menu.Item>
        <Menu.Item
          data-mp-event="IndexAdvisor Close Action Button Clicked"
          onClick={() => setCloseId(advisor.id)}
        >
          Close
        </Menu.Item>
        {/* 
        <Menu.Item data-mp-event="IndexAdvisor Delete Action Button Clicked" onClick={() => {}}>
          Delete
        </Menu.Item> 
        */}
      </Menu.Dropdown>
    </Menu>
  )
}

function useColumns() {
  const { setAdvisorId } = useIndexAdvisorUrlState()

  const columns = useMemo<MRT_ColumnDef<IndexAdvisorItem>[]>(() => {
    const cols: MRT_ColumnDef<IndexAdvisorItem>[] = [
      {
        id: "name",
        header: "Name",
        accessorKey: "name",
        enableSorting: false,
        Cell: (data) => (
          <Tooltip label={data.renderedCellValue} withArrow>
            <Typography
              variant="body-lg"
              c="peacock.7"
              sx={{
                cursor: "pointer",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: 280,
              }}
              onClick={() => {
                setAdvisorId(data.row.original.id)
              }}
            >
              {data.renderedCellValue}
            </Typography>
          </Tooltip>
        ),
      },
      {
        id: "database",
        header: "Database",
        enableSorting: false,
        accessorFn: (row) => (
          <Tooltip label={row.database} withArrow>
            <Box
              sx={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: 120,
              }}
            >
              {row.database}
            </Box>
          </Tooltip>
        ),
      },
      {
        id: "table",
        header: "Table",
        enableSorting: false,
        accessorFn: (row) => (
          <Tooltip label={row.table} withArrow>
            <Box
              sx={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: 200,
              }}
            >
              {row.table}
            </Box>
          </Tooltip>
        ),
      },
      {
        id: "last_recommended",
        header: "Last Recommended",
        enableSorting: false,
        // accessorFn: (row) => <TimeComponent time={row.last_recommend_time!} />
        accessorFn: (row) => row.last_recommend_time,
      },
      {
        id: "state",
        header: "Status",
        size: 120,
        accessorFn: (row) => (
          <AdvisorStatusIndicator
            label={capitalize(row.state!)}
            reason={row.state_reason!}
          />
        ),
      },
      {
        id: "improvement",
        header: "Improvement (%)",
        size: 120,
        accessorFn: (row) => (row.improvement! * 100).toFixed(2),
      },
      {
        id: "index_size",
        header: "Index Size (MiB)",
        size: 120,
        accessorFn: (row) => {
          if (row.index_size! < 0.01) {
            return (
              <Group spacing={0}>
                {"< 0.01"}
                <LabelTooltip label={`${row.index_size} MiB`} />
              </Group>
            )
          } else {
            return row.index_size
          }
        },
      },
      {
        id: "actions",
        header: "Action",
        enableSorting: false,
        accessorFn: (row) =>
          row.state === "OPEN" && <ActionMenuButton advisor={row} />,
        size: 60,
      },
    ]
    return cols
  }, [])

  return columns
}

export function AdvisorsTable() {
  const cols = useColumns()
  const { data, isLoading, isFetching } = useAdvisorsData()
  const { sortRule, setSortRule, pagination, setPagination } =
    useIndexAdvisorUrlState()

  const sortRules = useMemo(() => {
    return [{ id: sortRule.orderBy, desc: sortRule.desc }]
  }, [sortRule.orderBy, sortRule.desc])
  type onSortChangeFn = Required<MantineReactTableProps>["onSortingChange"]
  const setSortRules = useCallback<onSortChangeFn>(
    (updater) => {
      const newSort =
        typeof updater === "function" ? updater(sortRules) : updater
      if (newSort === sortRules) {
        return
      }
      setSortRule({ orderBy: newSort[0].id, desc: newSort[0].desc })
    },
    [setSortRule, sortRules],
  )

  return (
    <>
      <ProTable
        enableSorting
        manualSorting
        sortDescFirst
        columns={cols}
        data={data?.advices ?? []}
        onSortingChange={setSortRules}
        state={{ isLoading: isLoading || isFetching, sorting: sortRules }}
        pagination={{
          page: pagination.curPage,
          total: Math.ceil((data?.total ?? 0) / pagination.pageSize),
          onChange: (v) => setPagination({ ...pagination, curPage: v }),
          position: "center",
        }}
      />
      <AdvisorDetailDrawer advisors={data?.advices ?? []} />
      <ApplyModal />
      <CloseModal />
    </>
  )
}
