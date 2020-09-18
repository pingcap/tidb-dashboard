import { Col, Row } from 'antd'
import { ScrollablePane } from 'office-ui-fabric-react/lib/ScrollablePane'
import React, { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowLeftOutlined } from '@ant-design/icons'

import client from '@lib/client'
import { Head } from '@lib/components'
import { useClientRequestWithPolling } from '@lib/utils/useClientRequest'
import { SearchHeader, SearchProgress, SearchResult } from '../components'
import { TaskState } from '../utils'
import useQueryParams from '@lib/utils/useQueryParams'

export default function LogSearchingDetail() {
  const { t } = useTranslation()
  const { id } = useQueryParams()
  const [reloadKey, setReloadKey] = useState(false)

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
    (reqConfig) => client.getInstance().logsTaskgroupsIdGet(id, reqConfig),
    {
      shouldPoll: (data) => !isFinished(data),
    }
  )

  const tasks = useMemo(() => data?.tasks ?? [], [data])

  return (
    <Row>
      <Col
        span={18}
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
        }}
      >
        <Head
          title={t('search_logs.nav.detail')}
          back={
            <Link to={`/search_logs`}>
              <ArrowLeftOutlined /> {t('search_logs.nav.search_logs')}
            </Link>
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
      </Col>
      <Col span={6}>
        <SearchProgress
          key={`${reloadKey}`}
          toggleReload={toggleReload}
          taskGroupID={taskGroupID}
          tasks={tasks}
        />
      </Col>
    </Row>
  )
}
