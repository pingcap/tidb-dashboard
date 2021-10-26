import { Badge, Button } from 'antd'
import React, { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { usePersistFn } from 'ahooks'
import { upperFirst } from 'lodash'

import client from '@lib/client'
import { CardTable, DateTime, Head } from '@lib/components'
import { useClientRequest } from '@lib/utils/useClientRequest'
import { InstanceKindName } from '@lib/utils/instanceTable'
import useQueryParams from '@lib/utils/useQueryParams'

export default function Page() {
  const { t } = useTranslation()
  const { ts } = useQueryParams()

  const {
    data: groupProfileDetail,
    isLoading: groupDetailLoading,
    error: groupDetailError,
  } = useClientRequest(() => {
    return client.getInstance().continuousProfilingGroupProfileDetailGet(ts)
  })

  const profileDuration = groupProfileDetail?.profile_duration_secs || 0

  const columns = useMemo(
    () => [
      {
        name: t('continuous_profiling.detail.table.columns.instance'),
        key: 'instance',
        minWidth: 150,
        maxWidth: 400,
        onRender: (record) => record.target.address,
      },
      {
        name: t('continuous_profiling.detail.table.columns.kind'),
        key: 'kind',
        minWidth: 100,
        maxWidth: 150,
        onRender: (record) => {
          return InstanceKindName[record.target.component]
        },
      },
      {
        name: t('continuous_profiling.detail.table.columns.content'),
        key: 'content',
        minWidth: 150,
        maxWidth: 300,
        onRender: (record) => {
          const profileType = record.profile_type
          if (profileType === 'profile') {
            return `CPU Profiling - ${profileDuration}s`
          }
          return upperFirst(profileType)
        },
      },
      {
        name: t('continuous_profiling.detail.table.columns.status'),
        key: 'status',
        minWidth: 150,
        maxWidth: 200,
        onRender: (record) => {
          if (record.state === 'failed') {
            return <Badge status="error" text={record.error} />
          } else {
            return (
              <Badge
                status="success"
                text={t('continuous_profiling.detail.table.status.finished')}
              />
            )
          }
        },
      },
    ],
    [t, profileDuration]
  )

  const handleRowClick = usePersistFn(
    async (rec, _idx, _ev: React.MouseEvent<HTMLElement>) => {
      const {
        profile_type,
        target: { component, address },
      } = rec
      const res = await client
        .getInstance()
        .continuousProfilingActionTokenGet(
          `ts=${ts}&profile_type=${profile_type}&component=${component}&address=${address}`
        )
      const token = res.data
      if (!token) {
        return
      }
      window.open(
        `${client.getBasePath()}/continuous_profiling/single_profile/view?token=${token}`,
        '_blank'
      )
    }
  )

  const handleDownloadGroup = useCallback(async () => {
    const res = await client
      .getInstance()
      .continuousProfilingActionTokenGet(`ts=${ts}`)
    const token = res.data
    if (!token) {
      return
    }
    window.location.href = `${client.getBasePath()}/continuous_profiling/download?token=${token}`
  }, [ts])

  return (
    <div>
      <Head
        title={t('continuous_profiling.detail.head.title')}
        back={
          <Link to={`/continuous_profiling`}>
            <ArrowLeftOutlined /> {t('continuous_profiling.detail.head.back')}
          </Link>
        }
        titleExtra={
          <Button type="primary" onClick={handleDownloadGroup}>
            {t('continuous_profiling.detail.download')}
          </Button>
        }
      >
        {groupProfileDetail && (
          <DateTime.Long unixTimestampMs={groupProfileDetail.ts! * 1000} />
        )}
      </Head>
      <CardTable
        loading={groupDetailLoading}
        columns={columns}
        items={groupProfileDetail?.target_profiles || []}
        errors={[groupDetailError]}
        onRowClicked={handleRowClick}
        hideLoadingWhenNotEmpty
        extendLastColumn
      />
    </div>
  )
}
