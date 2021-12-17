import { Badge, Button, Dropdown, Menu } from 'antd'
import React, { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { usePersistFn } from 'ahooks'
import { upperFirst } from 'lodash'
import { IGroup } from 'office-ui-fabric-react/lib/DetailsList'

import client, { ConprofProfileDetail } from '@lib/client'
import { CardTable, DateTime, Descriptions, Head } from '@lib/components'
import { useClientRequest } from '@lib/utils/useClientRequest'
import { InstanceKindName } from '@lib/utils/instanceTable'
import useQueryParams from '@lib/utils/useQueryParams'
import publicPathPrefix from '@lib/utils/publicPathPrefix'

type Action = 'view_flamegraph' | 'view_graph' | 'view_text' | 'download'
const COMMON_ACTIONS: Action[] = ['view_flamegraph', 'view_graph', 'download']
const TEXT_ACTIONS: Action[] = ['view_text']

interface IActionsButtonProps {
  actions: Action[]
  disabled: boolean
  onClick: (action: Action) => void
  transKeyPrefix: string
}

function ActionsButton({
  actions,
  disabled,
  onClick,
  transKeyPrefix,
}: IActionsButtonProps) {
  const { t } = useTranslation()

  if (actions.length === 0) {
    throw new Error('actions should at least have one action')
  }

  // actions.length > 0
  const mainAction = actions[0]
  if (actions.length === 1) {
    return (
      <Button
        disabled={disabled}
        onClick={() => onClick(mainAction)}
        style={{ width: 150 }}
      >
        {t(`${transKeyPrefix}.${mainAction}`)}
      </Button>
    )
  }

  // actions.length > 1
  const menu = (
    <Menu onClick={(e) => onClick(e.key as Action)}>
      {actions.map((act, idx) => {
        // skip the first option in menu since it has been show on the button.
        if (idx !== 0) {
          return (
            <Menu.Item key={act}>{t(`${transKeyPrefix}.${act}`)}</Menu.Item>
          )
        }
      })}
    </Menu>
  )
  return (
    <Dropdown.Button
      disabled={disabled}
      overlay={menu}
      onClick={() => onClick(mainAction)}
    >
      {t(`${transKeyPrefix}.${mainAction}`)}
    </Dropdown.Button>
  )
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
      } else if (a.profile_type! > b.profile_type!) {
        return 1
      } else {
        return -1
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
            return `CPU Profiling - ${profileDuration}s`
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
          if (record.state === 'failed') {
            return <Badge status="error" text={record.error} />
          } else {
            return (
              <Badge
                status="success"
                text={t('conprof.detail.table.status.finished')}
              />
            )
          }
        },
      },
      {
        name: t('conprof.detail.table.columns.actions'),
        key: 'actions',
        minWidth: 150,
        maxWidth: 200,
        onRender: (record) => {
          const rec = record as ConprofProfileDetail
          let actions = TEXT_ACTIONS
          if (rec.profile_type !== 'goroutine') {
            actions = COMMON_ACTIONS
          }
          return (
            <ActionsButton
              actions={actions}
              disabled={rec.state !== 'success'}
              onClick={(act) => handleClick(act, rec)}
              transKeyPrefix="conprof.detail.table.actions"
            />
          )
        },
      },
    ],
    [t, profileDuration]
  )

  const handleClick = usePersistFn(
    async (action: Action, rec: ConprofProfileDetail) => {
      const { profile_type, target } = rec
      const { component, address } = target!
      const res = await client
        .getInstance()
        .continuousProfilingActionTokenGet(
          `ts=${ts}&profile_type=${profile_type}&component=${component}&address=${address}`
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
        const profileURL = `${client.getBasePath()}/continuous_profiling/single_profile/view?token=${token}&data_format=protobuf`
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
