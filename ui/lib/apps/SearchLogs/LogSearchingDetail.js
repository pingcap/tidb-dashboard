import { Head } from '@lib/components'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { Col, Row } from 'antd'
import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, Link } from 'react-router-dom'
import { SearchHeader, SearchProgress, SearchResult } from './components'
import client from '@lib/client'
import { useClientRequestWithPolling } from '@lib/utils/useClientRequest'

export default function LogSearchingDetail() {
  const { t } = useTranslation()
  const { id } = useParams()
  const taskGroupID = id === undefined ? 0 : +id

  function isFinished(data) {
    if (taskGroupID < 0) {
      return true
    }
    if (!data) {
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
          <SearchResult
            key={taskGroupID}
            taskGroupID={taskGroupID}
            tasks={tasks}
          />
        </Col>
        <Col span={6}>
          <SearchProgress
            key={taskGroupID}
            taskGroupID={taskGroupID}
            tasks={tasks}
          />
        </Col>
      </Row>
    </div>
  )
}
