import { LogsearchTaskModel } from '@lib/client'
import { CardTable, Card } from '@lib/components'
import { Alert } from 'antd'
import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useContext
} from 'react'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import { LogLevelText } from '../utils'
import {
  DetailsListLayoutMode,
  IColumn,
  IDetailsRowProps
} from 'office-ui-fabric-react/lib/DetailsList'
import { ComponentWithSortIndex, ILogItem, LogRow } from './LogRow'
import { sortBy } from 'lodash'
import { SearchLogsContext } from '../context'
import { tz } from '@lib/utils'

interface Props {
  patterns: string[]
  taskGroupID: number
  tasks: LogsearchTaskModel[]
}

export default function SearchResult({ patterns, taskGroupID, tasks }: Props) {
  const ctx = useContext(SearchLogsContext)

  const [logPreviews, setData] = useState<ILogItem[]>([])
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)

  const componentByTaskId = useMemo(() => {
    const sortedComponents = sortBy(
      tasks.map((t) => ({
        ...t.target,
        sortIndex: 0,
        taskId: t.id
      })),
      (target) => `${target?.kind} ${target?.display_name}`
    )

    sortedComponents.forEach((c, idx) => {
      c.sortIndex = idx / sortedComponents.length
    })

    const byTaskId: Record<number, ComponentWithSortIndex> = {}
    sortedComponents.forEach((c) => {
      byTaskId[c.taskId ?? -1] = c
    })
    return byTaskId
  }, [tasks])

  useEffect(() => {
    async function getLogPreview() {
      if (!taskGroupID) {
        return
      }
      try {
        const res = await ctx!.ds.logsTaskgroupsIdPreviewGet(taskGroupID + '')
        setData(
          res.data.map((value, index): ILogItem => {
            return {
              key: index,
              time: dayjs(value.time)
                .utcOffset(tz.getTimeZone())
                .format('YYYY-MM-DD HH:mm:ss (UTCZ)'),
              level: LogLevelText[value.level ?? 0],
              component: componentByTaskId[value.task_id ?? -1],
              log: value.message
            }
          })
        )
      } finally {
        setLoading(false)
      }
    }
    if (tasks.length > 0 && taskGroupID !== tasks[0].task_group_id) {
      setLoading(true)
    }
    getLogPreview()
  }, [taskGroupID, componentByTaskId, tasks, ctx])

  const renderRow = useCallback(
    (props?: IDetailsRowProps, defaultRender?) => {
      if (!props) {
        return null
      }
      return <LogRow patterns={patterns} {...props} />
    },
    [patterns]
  )

  const columns = useMemo<IColumn[]>(
    () => [
      {
        name: t('search_logs.preview.time'),
        key: 'time',
        fieldName: 'time',
        minWidth: 120,
        maxWidth: 200
      },
      {
        name: t('search_logs.preview.component'),
        key: 'component',
        minWidth: 40,
        maxWidth: 150
      },
      {
        name: t('search_logs.preview.log'),
        key: 'log',
        minWidth: 100,
        maxWidth: 100,
        isResizable: false
      }
    ],
    [t]
  )

  return (
    <div data-e2e="log_search_result">
      {!loading && (
        <Card noMarginTop>
          <Alert message={t('search_logs.page.tip')} type="info" showIcon />
        </Card>
      )}
      <CardTable
        cardNoMarginTop
        loading={loading}
        columns={columns}
        items={logPreviews || []}
        onRenderRow={renderRow}
        extendLastColumn
        hideLoadingWhenNotEmpty
        layoutMode={DetailsListLayoutMode.fixedColumns}
      />
    </div>
  )
}
