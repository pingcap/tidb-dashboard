import { Button, Drawer } from 'antd'
import { ScrollablePane } from 'office-ui-fabric-react/lib/ScrollablePane'
import React, { useContext, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowLeftOutlined } from '@ant-design/icons'

import { Head } from '@lib/components'
import { useClientRequestWithPolling } from '@lib/utils/useClientRequest'
import { SearchHeader, SearchProgress, SearchResult } from '../components'
import { TaskState } from '../utils'
import useQueryParams from '@lib/utils/useQueryParams'
import { SearchLogsContext } from '../context'

export default function LogSearchingDetail() {
  const ctx = useContext(SearchLogsContext)

  const { t } = useTranslation()
  const { id } = useQueryParams()
  const [reloadKey, setReloadKey] = useState(false)
  const [taskWasUnfinished, setTaskUnfinished] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState<boolean | undefined>(undefined)

  function toggleReload() {
    setReloadKey(!reloadKey)
  }

  const taskGroupID = id === undefined ? 0 : +id

  function isFinished(data) {
    if (taskGroupID < 0) {
      return true
    }
    if (!data) {
      return false
    }
    if (data.tasks.some((task) => task.state === TaskState.Running)) {
      return false
    }
    return true
  }

  const { data } = useClientRequestWithPolling(
    (reqConfig) => ctx!.ds.logsTaskgroupsIdGet(id, reqConfig),
    {
      shouldPoll: (data) => !isFinished(data)
    }
  )

  const tasks = useMemo(() => data?.tasks ?? [], [data])

  useEffect(() => {
    for (const task of data?.tasks ?? []) {
      if (task.state !== TaskState.Finished) {
        setTaskUnfinished(true)
        break
      }
    }
  }, [data])

  return (
    <>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100vh'
        }}
      >
        <Head
          title={t('search_logs.nav.detail')}
          back={
            <Link to={`/search_logs`}>
              <ArrowLeftOutlined /> {t('search_logs.nav.search_logs')}
            </Link>
          }
          titleExtra={
            <Button type="primary" onClick={() => setSidebarOpen(true)}>
              {t('search_logs.nav.show_sidebar')}
            </Button>
          }
        ></Head>
        <div style={{ height: '100%', position: 'relative', marginRight: 4 }}>
          <ScrollablePane>
            <div style={{ marginLeft: 48, marginRight: 48, marginBottom: 24 }}>
              <SearchHeader taskGroupID={taskGroupID} />
            </div>
            <SearchResult
              patterns={data?.task_group?.search_request?.patterns || []}
              taskGroupID={taskGroupID}
              tasks={tasks}
            />
          </ScrollablePane>
        </div>
      </div>
      <Drawer
        mask={false}
        visible={sidebarOpen ?? taskWasUnfinished}
        width={350}
        title={t('search_logs.common.progress')}
        onClose={() => setSidebarOpen(false)}
      >
        <SearchProgress
          key={`${reloadKey}`}
          toggleReload={toggleReload}
          taskGroupID={taskGroupID}
          tasks={tasks}
        />
      </Drawer>
    </>
  )
}
