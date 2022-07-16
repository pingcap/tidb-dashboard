import { CopyLink, Descriptions, TextWithInfo } from '@lib/components'
import { store } from '@lib/utils/store'
import { Space } from 'antd'
import React from 'react'

export function VersionForm() {
  const info = store.useState((s) => s.appInfo)

  return (
    <>
      {Boolean(info) && (
        <Descriptions>
          <Descriptions.Item
            span={2}
            label={
              <Space size="middle">
                <TextWithInfo.TransKey transKey="user_profile.version.internal_version" />
                <CopyLink data={info!.version?.internal_version} />
              </Space>
            }
          >
            {info!.version?.internal_version}
          </Descriptions.Item>
          <Descriptions.Item
            span={2}
            label={
              <Space size="middle">
                <TextWithInfo.TransKey transKey="user_profile.version.build_git_hash" />
                <CopyLink data={info!.version?.build_git_hash} />
              </Space>
            }
          >
            {info!.version?.build_git_hash}
          </Descriptions.Item>
          <Descriptions.Item
            span={2}
            label={
              <TextWithInfo.TransKey transKey="user_profile.version.build_time" />
            }
          >
            {info!.version?.build_time}
          </Descriptions.Item>
          <Descriptions.Item
            span={2}
            label={
              <TextWithInfo.TransKey transKey="user_profile.version.standalone" />
            }
          >
            {info!.version?.standalone}
          </Descriptions.Item>
          <Descriptions.Item
            span={2}
            label={
              <Space size="middle">
                <TextWithInfo.TransKey transKey="user_profile.version.pd_version" />
                <CopyLink data={info!.version?.pd_version} />
              </Space>
            }
          >
            {info!.version?.pd_version}
          </Descriptions.Item>
        </Descriptions>
      )}
    </>
  )
}
