import { Alert, Col, Row } from 'antd'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { SearchHeader, SearchProgress, SearchResult } from './components'
import {  useLocation} from "react-router-dom";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function LogSearchingDetail() {
  const query = useQuery()
  const taskGroupID = query.get("id") === undefined ? 0 : +query.get("id")

  const { t } = useTranslation()
  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col span={18}>
          <SearchHeader />
          <Alert
            message={t('log_searching.page.tip')}
            type="info"
            showIcon
            style={{ marginTop: 14, marginBottom: 14 }}
          />
          <SearchResult taskGroupID={taskGroupID}/>
        </Col>
        <Col span={6}>
          <SearchProgress taskGroupID={taskGroupID}/>
        </Col>
      </Row>
    </div>
  )
}
