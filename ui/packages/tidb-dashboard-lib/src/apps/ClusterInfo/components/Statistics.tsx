import React, { useContext } from 'react'
import { useClientRequest } from '@lib/utils/useClientRequest'
import { ClusterinfoClusterStatisticsPartial } from '@lib/client'
import { AnimatedSkeleton, ErrorBar, Descriptions, Card } from '@lib/components'
import { useTranslation } from 'react-i18next'
import { getValueFormat } from '@baurine/grafana-value-formats'
import { Alert } from 'antd'

import styles from './Statistics.module.less'
import { InstanceKinds, instanceKindName } from '@lib/utils/instanceTable'
import { ClusterInfoContext } from '../context'

function PartialInfo({ data }: { data?: ClusterinfoClusterStatisticsPartial }) {
  const { t } = useTranslation()
  return (
    <Descriptions>
      <Descriptions.Item
        span={2}
        label={t('cluster_info.list.statistics.field.instances')}
      >
        {data?.number_of_instances ?? 'Unknown'}
      </Descriptions.Item>
      <Descriptions.Item
        span={2}
        label={t('cluster_info.list.statistics.field.hosts')}
      >
        {data?.number_of_hosts ?? 'Unknown'}
      </Descriptions.Item>
      <Descriptions.Item
        span={2}
        label={t('cluster_info.list.statistics.field.memory_capacity')}
      >
        {getValueFormat('bytes')(data?.total_memory_capacity_bytes ?? 0, 1)}
      </Descriptions.Item>
      <Descriptions.Item
        span={2}
        label={t('cluster_info.list.statistics.field.physical_cores')}
      >
        {data?.total_physical_cores ?? 'Unknown'}
      </Descriptions.Item>
      <Descriptions.Item
        span={2}
        label={t('cluster_info.list.statistics.field.logical_cores')}
      >
        {data?.total_logical_cores ?? 'Unknown'}
      </Descriptions.Item>
    </Descriptions>
  )
}

export default function Statistics() {
  const ctx = useContext(ClusterInfoContext)

  const { data, isLoading, error } = useClientRequest(
    ctx!.ds.clusterInfoGetStatistics
  )
  const { t } = useTranslation()

  return (
    <AnimatedSkeleton showSkeleton={isLoading}>
      {error && <ErrorBar errors={[error]} />}
      {data && (
        <div className={styles.content}>
          {(data.probe_failure_hosts ?? 0) > 0 && (
            <Card>
              <Alert
                message={t(
                  'cluster_info.list.statistics.message.instance_down',
                  { n: data.probe_failure_hosts ?? 0 }
                )}
                type="warning"
                showIcon
              />
            </Card>
          )}
          <Card title={t('cluster_info.list.statistics.summary_title')}>
            <Descriptions>
              <Descriptions.Item
                span={2}
                label={t('cluster_info.list.statistics.field.version')}
              >
                {(data.versions ?? []).join(', ')}
              </Descriptions.Item>
            </Descriptions>
            <PartialInfo data={data.total_stats} />
          </Card>
          <Card>
            <Alert
              message={t('cluster_info.list.statistics.message.sub_statistics')}
              type="info"
              showIcon
            />
          </Card>
          {InstanceKinds.map((ik) => {
            const d = data.stats_by_instance_kind?.[ik]
            const instNum = d?.number_of_instances ?? 0
            return instNum > 0 ? (
              <Card title={instanceKindName(ik)} key={ik}>
                <PartialInfo data={d} />
              </Card>
            ) : null
          })}
        </div>
      )}
    </AnimatedSkeleton>
  )
}
