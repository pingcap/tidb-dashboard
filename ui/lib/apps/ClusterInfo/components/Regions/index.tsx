import React from 'react'
import { Button } from 'antd'
import { AreaChartOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'

export default function Regions() {
  const { t } = useTranslation()
  function openExplorer() {
    window.open('/dashboard/tools/dataviz?default=regions', '_blank')
  }
  return (
    <div>
      <Button icon={<AreaChartOutlined />} size="large" onClick={openExplorer}>
        {t('cluster_info.list.regions.open')}
      </Button>
    </div>
  )
}
