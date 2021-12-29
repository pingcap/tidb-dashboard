import { Badge, Button, Dropdown, Menu } from 'antd'
import React, { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { usePersistFn } from 'ahooks'
import { upperFirst } from 'lodash'
import { IGroup } from 'office-ui-fabric-react/lib/DetailsList'

import client, { ConprofProfileDetail } from '@lib/client'
import {
  CardTable,
  DateTime,
  Descriptions,
  Head,
  ActionsButton,
} from '@lib/components'
import { useClientRequest } from '@lib/utils/useClientRequest'
import { InstanceKindName } from '@lib/utils/instanceTable'
import useQueryParams from '@lib/utils/useQueryParams'
import publicPathPrefix from '@lib/utils/publicPathPrefix'

const COMMON_ACTIONS: string[] = ['view_flamegraph', 'view_graph', 'download']
const TEXT_ACTIONS: string[] = ['view_text', 'download']

const profileTypeSortOrder: { [key: string]: number } = {
  profile: 1,
  heap: 2,
  goroutine: 3,
  mutex: 4,
}

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

  const [tableData, groupData] = useMemo(() => {
    const newRows: ConprofProfileDetail[] = []
    const newGroups: IGroup[] = []

    let startIndex = 0
    const profiles = groupProfileDetail?.target_profiles || []
    profiles.sort((a, b) => {
      if (a.target!.component! > b.target!.component!) {
        return 1
      } else {
        return (
          (profileTypeSortOrder[a.profile_type!] ?? 0) -
          (profileTypeSortOrder[b.profile_type!] ?? 0)
        )
      }
    })
    for (const instanceKind of ['pd', 'tidb', 'tikv', 'tiflash']) {
      profiles.forEach((p) => {
        if (p.target?.component === instanceKind) {
          newRows.push(p)
        }
      })

      newGroups.push({
        key: InstanceKindName[instanceKind],
        name: InstanceKindName[instanceKind],
        startIndex: startIndex,
        count: newRows.length - startIndex,
      })
      startIndex = newRows.length
    }

    return [newRows, newGroups]
  }, [groupProfileDetail])

  const columns = useMemo(
    () => [
      {
        name: t('conprof.detail.table.columns.instance'),
        key: 'instance',
        minWidth: 150,
        maxWidth: 300,
        onRender: (record) => record.target.address,
      },
      {
        name: t('conprof.detail.table.columns.content'),
        key: 'content',
        minWidth: 150,
        maxWidth: 300,
        onRender: (record) => {
          const profileType = record.profile_type
          if (profileType === 'profile') {
            return `CPU - ${profileDuration}s`
          }
          return upperFirst(profileType)
        },
      },
      {
        name: t('conprof.detail.table.columns.status'),
        key: 'status',
        minWidth: 150,
        maxWidth: 200,
        onRender: (record) => {
          if (record.state === 'finished' || record.state === 'success') {
            return (
              <Badge
                status="success"
                text={t('conprof.detail.table.status.finished')}
              />
            )
          }
          if (record.state === 'failed') {
            return <Badge status="error" text={record.error} />
          }
          return <Badge text={t('conprof.list.table.status.unknown')} />
        },
      },
      {
        name: t('conprof.detail.table.columns.actions'),
        key: 'actions',
        minWidth: 150,
        maxWidth: 200,
        onRender: (record) => {
          const rec = record as ConprofProfileDetail
          let actionsKey = TEXT_ACTIONS
          if (rec.profile_type !== 'goroutine') {
            actionsKey = COMMON_ACTIONS
          }
          const actions = actionsKey.map((key) => ({
            key,
            text: t(`conprof.detail.table.actions.${key}`),
          }))
          return (
            <ActionsButton
              actions={actions}
              disabled={rec.state !== 'finished' && rec.state !== 'success'}
              onClick={(act) => handleClick(act, rec)}
            />
          )
        },
      },
    ],
    [t, profileDuration]
  )

  const handleClick = usePersistFn(
    async (action: string, rec: ConprofProfileDetail) => {
      const { profile_type, target } = rec
      const { component, address } = target!
      let dataFormat = ''
      if (action === 'view_flamegraph' || action === 'download') {
        dataFormat = 'protobuf'
      }
      const res = await client
        .getInstance()
        .continuousProfilingActionTokenGet(
          `ts=${ts}&profile_type=${profile_type}&component=${component}&address=${address}&data_format=${dataFormat}`
        )
      const token = res.data
      if (!token) {
        return
      }

      if (action === 'view_graph' || action === 'view_text') {
        const profileURL = `${client.getBasePath()}/continuous_profiling/single_profile/view?token=${token}`
        window.open(profileURL, '_blank')
        return
      }

      if (action === 'view_flamegraph') {
        // view flamegraph by speedscope
        const speedscopeTitle = `${rec.target?.component}_${rec.target?.address}_${rec.profile_type}`
        const profileURL = `${client.getBasePath()}/continuous_profiling/single_profile/view?token=${token}`
        const speedscopeURL = `${publicPathPrefix}/speedscope#profileURL=${encodeURIComponent(
          profileURL
        )}&title=${speedscopeTitle}`
        window.open(speedscopeURL, '_blank')
        return
      }

      if (action === 'download') {
        window.location.href = `${client.getBasePath()}/continuous_profiling/download?token=${token}`
        return
      }
    }
  )

  const handleDownloadGroup = useCallback(async () => {
    const res = await client
      .getInstance()
      .continuousProfilingActionTokenGet(`ts=${ts}&data_format=protobuf`)
    const token = res.data
    if (!token) {
      return
    }
    window.location.href = `${client.getBasePath()}/continuous_profiling/download?token=${token}`
  }, [ts])

  return (
    <div>
      <Head
        title={t('conprof.detail.head.title')}
        back={
          <Link to={`/continuous_profiling`}>
            <ArrowLeftOutlined /> {t('conprof.detail.head.back')}
          </Link>
        }
        titleExtra={
          <Button type="primary" onClick={handleDownloadGroup}>
            {t('conprof.detail.download')}
          </Button>
        }
      >
        {groupProfileDetail && (
          <Descriptions>
            <Descriptions.Item
              span={2}
              label={t('conprof.detail.head.start_at')}
            >
              <DateTime.Long unixTimestampMs={groupProfileDetail.ts! * 1000} />
            </Descriptions.Item>
          </Descriptions>
        )}
      </Head>

      <CardTable
        disableSelectionZone
        loading={groupDetailLoading}
        columns={columns}
        items={tableData}
        groups={groupData}
        groupProps={{
          showEmptyGroups: true,
        }}
        errors={[groupDetailError]}
        hideLoadingWhenNotEmpty
        extendLastColumn
      />
    </div>
  )
}
