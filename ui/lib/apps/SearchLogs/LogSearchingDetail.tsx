import { Head, Card } from '@lib/components'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { Col, Row } from 'antd'
import React, { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, Link } from 'react-router-dom'
import { SearchHeader, SearchProgress, SearchResult } from './components'
import client from '@lib/client'
import { useClientRequestWithPolling } from '@lib/utils/useClientRequest'
import { TaskState } from './components/utils'
import { ScrollablePane } from 'office-ui-fabric-react/lib/ScrollablePane'

export default function LogSearchingDetail() {
  const { t } = useTranslation()
  const { id } = useParams()
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
    (cancelToken) =>
      client.getInstance().logsTaskgroupsIdGet(id, { cancelToken }),
    {
      shouldPoll: (data) => !isFinished(data),
      pollingInterval: 1000,
      immediate: true,
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
            <SearchResult taskGroupID={taskGroupID} tasks={tasks} />
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
