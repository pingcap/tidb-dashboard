import { Badge, Button, Modal, Space } from 'antd'
import React, { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { upperFirst } from 'lodash'
import { IGroup } from 'office-ui-fabric-react/lib/DetailsList'
import client, { ConprofProfileDetail } from '@lib/client'
import { CardTable, DateTime, Descriptions, Head } from '@lib/components'
import { useClientRequest } from '@lib/utils/useClientRequest'
import { InstanceKindName } from '@lib/utils/instanceTable'
import useQueryParams from '@lib/utils/useQueryParams'
import publicPathPrefix from '@lib/utils/publicPathPrefix'

// TODO: Share common code with Instance Profiling
enum ViewAsOptions {
  FlameGraph = 'flamegraph',
  Graph = 'graph',
  Raw = 'raw',
}

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

      if (newRows.length - startIndex > 0) {
        newGroups.push({
          key: InstanceKindName[instanceKind],
          name: InstanceKindName[instanceKind],
          startIndex: startIndex,
          count: newRows.length - startIndex,
        })
        startIndex = newRows.length
      }
    }

    return [newRows, newGroups]
  }, [groupProfileDetail])

  const openResult = useCallback(
    async (view_as: ViewAsOptions, rec: ConprofProfileDetail) => {
      const { profile_type, target } = rec
      const { component, address } = target!
      let dataFormat = ''
      if (
        view_as === ViewAsOptions.FlameGraph ||
        view_as === ViewAsOptions.Raw
      ) {
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

      if (view_as === ViewAsOptions.Graph || view_as === ViewAsOptions.Raw) {
        const profileURL = `${client.getBasePath()}/continuous_profiling/single_profile/view?token=${token}`
        window.open(profileURL, '_blank')
        return
      }

      if (view_as === ViewAsOptions.FlameGraph) {
        // view flamegraph by speedscope
        const titleOnTab = `${rec.target?.component} - ${rec.target?.address} (${rec.profile_type})`
        const protoURL = `${client.getBasePath()}/continuous_profiling/single_profile/view?token=${token}`
        const url = `${publicPathPrefix}/speedscope/#profileURL=${encodeURIComponent(
          protoURL
        )}&title=${encodeURIComponent(titleOnTab)}`
        window.open(url, '_blank')
        return
      }
    },
    [ts]
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
        minWidth: 100,
        maxWidth: 100,
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
        minWidth: 100,
        maxWidth: 100,
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
            return (
              <Badge
                status="error"
                text={t('conprof.detail.table.status.failed')}
              />
            )
          }
          return <Badge text={t('conprof.list.table.status.unknown')} />
        },
      },
      {
        name: t('conprof.detail.table.columns.view_as'),
        key: 'view_as',
        minWidth: 250,
        maxWidth: 400,
        onRender: (record) => {
          if (record.state === 'failed') {
            return (
              <a
                href="javascript:;"
                onClick={() => {
                  Modal.error({
                    title: 'Profile Error',
                    content: record.error,
                  })
                }}
              >
                {t('conprof.detail.view_as.error')}
              </a>
            )
          }

          let actions: ViewAsOptions[] = []
          if (
            record.profile_type === 'profile' ||
            record.profile_type === 'heap'
          ) {
            actions = [
              ViewAsOptions.FlameGraph,
              ViewAsOptions.Graph,
              ViewAsOptions.Raw,
            ]
          } else {
            actions = [ViewAsOptions.Raw]
          }
          return (
            <Space>
              {actions.map((action) => {
                return (
                  <a
                    href="javascript:;"
                    onClick={() => openResult(action, record)}
                    key={action}
                  >
                    {t(`conprof.detail.view_as.${action}`)}
                  </a>
                )
              })}
            </Space>
          )
        },
      },
    ],
    [t, profileDuration, openResult]
  )

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
        errors={[groupDetailError]}
        hideLoadingWhenNotEmpty
        extendLastColumn
      />
    </div>
  )
}
