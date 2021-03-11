import React from 'react'
import { Collapse, Tag, Space } from 'antd'

import { Card } from '@lib/components'
import style from './ApiList.module.less'
import metadataGroups, { Metadata } from './metadata'
import ApiForm from './ApiForm'

const isStrArr = (s: any): s is string[] => Array.isArray(s) && !!s.length

const CustomHeader = (m: Metadata) => (
  <div className={style.header}>
    <Space direction="vertical">
      <Space>
        <h4>{m.name}</h4>
        <span>
          {(m.tags?.length || '') && m.tags!.map((t) => <Tag key={t}>{t}</Tag>)}
        </span>
      </Space>
      {isStrArr(m.schema) ? m.schema.map((s) => Schema(s)) : Schema(m.schema)}
    </Space>
  </div>
)

const Schema = (schema: string) => (
  <p key={schema} className={style.schema}>
    {schema}
  </p>
)

export default function Page() {
  return (
    <>
      {metadataGroups.map((g) => (
        <Card key={g.name} title={g.name}>
          <Collapse ghost>
            {g.children.map((m, i) => (
              <Collapse.Panel
                className={style.collapse_panel}
                header={CustomHeader(m)}
                key={i}
              >
                <ApiForm />
              </Collapse.Panel>
            ))}
          </Collapse>
        </Card>
      ))}
    </>
  )
}
