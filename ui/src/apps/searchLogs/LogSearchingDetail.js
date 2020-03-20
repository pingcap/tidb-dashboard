import { Head } from "@pingcap-incubator/dashboard_components";
import { Col, Row, Icon } from 'antd';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, Link } from "react-router-dom";
import { SearchHeader, SearchProgress, SearchResult } from './components';

export default function LogSearchingDetail() {
  const { t } = useTranslation()
  const { id } = useParams()
  const taskGroupID = id === undefined ? 0 : +id

  const [tasks, setTasks] = useState([])

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col span={18}>
          <Head
            title={t('search_logs.nav.detail')}
            back={
              <Link to={`/search_logs`}>
                <Icon type="arrow-left" />{' '}
                {t('search_logs.nav.search_logs')}
              </Link>
            } />
          <div style={{ marginLeft: 48, marginRight: 48 }}>
            <SearchHeader taskGroupID={taskGroupID} />
          </div>
          <SearchResult taskGroupID={taskGroupID} tasks={tasks} />
        </Col>
        <Col span={6}>
          <SearchProgress taskGroupID={taskGroupID} tasks={tasks} setTasks={setTasks} />
        </Col>
      </Row>
    </div>
  )
}
