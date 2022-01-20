import { Badge, Button, Modal, Progress, Space, Tooltip } from 'antd'
import React, { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowLeftOutlined, QuestionCircleOutlined } from '@ant-design/icons'
import { upperFirst } from 'lodash'
import client, { ViewBundle, ViewProfile } from '@lib/client'
import { CardTable, DateTime, Head, Descriptions } from '@lib/components'
import { useClientRequestWithPolling } from '@lib/utils/useClientRequest'
import publicPathPrefix from '@lib/utils/publicPathPrefix'
import {
  InstanceKind,
  InstanceKindName,
  InstanceKinds,
} from '@lib/utils/instanceTable'
import useQueryParams from '@lib/utils/useQueryParams'
import { IGroup } from 'office-ui-fabric-react/lib/DetailsList'
import { ScrollablePane } from 'office-ui-fabric-react/lib/ScrollablePane'
import _ from 'lodash'
import { BundleState, ProfDataType, ProfileState } from '../utils/constants'

enum ViewAsOptions {
  FlameGraph = 'flamegraph',
  Graph = 'graph',
  Raw = 'raw',
}

function isFinished(bundle?: ViewBundle) {
  return (
    [
      BundleState.AllFailed,
      BundleState.AllSucceeded,
      BundleState.PartialSucceeded,
    ].indexOf((bundle?.state ?? '') as BundleState) > -1
  )
}

export default function Page() {
  const { t } = useTranslation()
  const { id } = useQueryParams()

  const { data, isLoading, error } = useClientRequestWithPolling(
    (reqConfig) =>
      client.getInstance().profilingGetBundle(
        {
          bundle_id: Number(id),
        },
        reqConfig
      ),
    {
      shouldPoll: (data) => !isFinished(data.bundle),
    }
  )

  const profileDuration = data?.bundle?.duration_sec ?? 0

  const [tableData, groupData] = useMemo(() => {
    const newRows: ViewProfile[] = []
    const newGroups: IGroup[] = []
    let startIndex = 0

    const profilesByComponent: Record<InstanceKind, ViewProfile[]> = _.groupBy(
      data?.profiles ?? [],
      'target.kind'
    ) as any
    for (const instanceKind of InstanceKinds) {
      if (!profilesByComponent[instanceKind]?.length) {
        continue
      }
      for (const profile of profilesByComponent[instanceKind]) {
        newRows.push(profile)
      }
      newGroups.push({
        key: instanceKind,
        name: InstanceKindName[instanceKind],
        startIndex: startIndex,
        count: newRows.length - startIndex,
      })
      startIndex = newRows.length
    }
    return [newRows, newGroups]
  }, [data])

  const openResult = useCallback(
    async (viewAs: ViewAsOptions, rec: ViewProfile) => {
      switch (viewAs) {
        case ViewAsOptions.Raw: {
          const token = await client
            .getInstance()
            .profilingGetTokenForProfileData({
              profile_id: rec.profile_id,
              render_as: 'unchanged',
            })
          window.open(
            `${client.getBasePath()}/profiling/profile/render?token=${
              token.data
            }`
          )
          break
        }
        case ViewAsOptions.FlameGraph: {
          const token = await client
            .getInstance()
            .profilingGetTokenForProfileData({
              profile_id: rec.profile_id,
              render_as: 'unchanged',
            })
          const protoURL = `${client.getBasePath()}/profiling/profile/render?token=${
            token.data
          }`
          const titleOnTab = `${rec.target?.kind} - ${rec.target?.ip}:${rec.target?.port} (${rec.kind})`
          const url = `${publicPathPrefix}/speedscope/#profileURL=${encodeURIComponent(
            protoURL
          )}&title=${encodeURIComponent(titleOnTab)}`
          window.open(`${url}`, '_blank')
          break
        }
        case ViewAsOptions.Graph: {
          const token = await client
            .getInstance()
            .profilingGetTokenForProfileData({
              profile_id: rec.profile_id,
              render_as: 'svg_graph',
            })
          window.open(
            `${client.getBasePath()}/profiling/profile/render?token=${
              token.data
            }`
          )
          break
        }
      }
    },
    []
  )

  const columns = useMemo(
    () => [
      {
        name: t('instance_profiling.detail.table.columns.instance'),
        key: 'instance',
        minWidth: 150,
        maxWidth: 250,
        onRender: (record: ViewProfile) => {
          return `${record.target?.ip}:${record.target?.port}`
        },
      },
      {
        name: t('instance_profiling.detail.table.columns.content'),
        key: 'content',
        minWidth: 100,
        maxWidth: 100,
        onRender: (record: ViewProfile) => {
          if (record.kind === 'cpu') {
            return `CPU - ${profileDuration}s`
          } else {
            return upperFirst(record.kind)
          }
        },
      },
      {
        name: t('instance_profiling.detail.table.columns.status'),
        key: 'status',
        minWidth: 100,
        maxWidth: 100,
        onRender: (record: ViewProfile) => {
          if (record.state === ProfileState.Running) {
            return (
              <div style={{ width: 200 }}>
                <Progress
                  percent={~~((record.progress ?? 0) * 100)}
                  size="small"
                  width={200}
                />
              </div>
            )
          } else if (record.state === ProfileState.Error) {
            return (
              <Badge
                status="error"
                text={t('instance_profiling.common.profile_state.error')}
              />
            )
          } else if (record.state == ProfileState.Skipped) {
            return (
              <Tooltip
                title={t(
                  'instance_profiling.common.profile_state.skipped_tooltip'
                )}
              >
                <Badge
                  status="default"
                  text={
                    <span>
                      {t('instance_profiling.common.profile_state.skipped')}{' '}
                      <QuestionCircleOutlined />
                    </span>
                  }
                />
              </Tooltip>
            )
          } else if (record.state == ProfileState.Succeeded) {
            return (
              <Badge
                status="success"
                text={t('instance_profiling.common.profile_state.suceeded')}
              />
            )
          } else {
            return (
              <Badge
                status="error"
                text={t('instance_profiling.common.profile_state.unknown')}
              />
            )
          }
        },
      },
      {
        name: t('instance_profiling.detail.table.columns.view_as'),
        key: 'view_as',
        minWidth: 250,
        maxWidth: 400,
        onRender: (record: ViewProfile) => {
          if (record.state === ProfileState.Error) {
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
                {t('instance_profiling.detail.view_as.error')}
              </a>
            )
          }

          if (record.state !== ProfileState.Succeeded) {
            return <></>
          }

          let actions: ViewAsOptions[] = []
          if (record.data_type == ProfDataType.Protobuf) {
            actions = [
              ViewAsOptions.FlameGraph,
              ViewAsOptions.Graph,
              ViewAsOptions.Raw,
            ]
          } else if (record.data_type == ProfDataType.Text) {
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
                    {t(`instance_profiling.detail.view_as.${action}`)}
                  </a>
                )
              })}
            </Space>
          )
        },
      },
    ],
    [t, profileDuration]
  )

  const handleDownloadGroup = useCallback(async () => {
    const token = await client
      .getInstance()
      .profilingGetTokenForBundleData({ bundle_id: Number(id) })
    window.location.href = `${client.getBasePath()}/profiling/bundle/download?token=${
      token.data
    }`
  }, [id])

  const getKey = useCallback((rec: ViewProfile) => {
    return `${rec.kind}${rec.target?.ip}${rec.target?.port}`
  }, [])

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Head
        title={t('instance_profiling.detail.head.title')}
        back={
          <Link to={`/instance_profiling`}>
            <ArrowLeftOutlined /> {t('instance_profiling.detail.head.back')}
          </Link>
        }
        titleExtra={
          <Button
            disabled={!isFinished(data?.bundle)}
            type="primary"
            onClick={handleDownloadGroup}
          >
            {t('instance_profiling.detail.download')}
          </Button>
        }
      >
        {data && (
          <Descriptions>
            <Descriptions.Item
              span={2}
              label={t('instance_profiling.detail.head.start_at')}
            >
              <DateTime.Calendar unixTimestampMs={data.bundle?.start_at ?? 0} />
            </Descriptions.Item>
          </Descriptions>
        )}
      </Head>
      <div style={{ height: '100%', position: 'relative' }}>
        <ScrollablePane>
          <CardTable
            getKey={getKey}
            cardNoMarginTop
            disableSelectionZone
            loading={isLoading}
            columns={columns}
            items={tableData}
            errors={[error]}
            groups={groupData}
            hideLoadingWhenNotEmpty
            extendLastColumn
          />
        </ScrollablePane>
      </div>
    </div>
  )
}
