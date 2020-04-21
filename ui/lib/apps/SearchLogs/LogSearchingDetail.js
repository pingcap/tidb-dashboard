import { Head } from '@lib/components'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { Col, Row } from 'antd'
import React, { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, Link } from 'react-router-dom'
import { SearchHeader, SearchProgress, SearchResult } from './components'
import client from '@lib/client'
import { useClientRequestWithPolling } from '@lib/utils/useClientRequest'
import { TaskState } from './components/utils'

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
      return true
    }
    return false
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
    <div>
      <Row>
        <Col span={18}>
          <Head
            title={t('search_logs.nav.detail')}
            back={
              <Link to={`/search_logs`}>
                <ArrowLeftOutlined /> {t('search_logs.nav.search_logs')}
              </Link>
            }
          >
            <SearchHeader taskGroupID={taskGroupID} />
          </Head>
          <SearchResult taskGroupID={taskGroupID} tasks={tasks} />
        </Col>
        <Col span={6}>
          <SearchProgress
            key={reloadKey}
            toggleReload={toggleReload}
            taskGroupID={taskGroupID}
            tasks={tasks}
          />
        </Col>
      </Row>
    </div>
  )
}
