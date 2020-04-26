import React, { ReactNode, useMemo } from 'react'
import { Checkbox, Popover, Space } from 'antd'
import { DownOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { IColumn } from 'office-ui-fabric-react/lib/DetailsList'
import { addTranslationResource } from '@lib/utils/i18n'

import styles from './index.module.less'

const translations = {
  en: {
    text: 'Columns',
  },
  'zh-CN': {
    text: '选择列',
  },
}

for (const key in translations) {
  addTranslationResource(key, {
    component: {
      columnsSelector: translations[key],
    },
  })
}

export interface IColumnsSelectorProps {
  columns: IColumn[]
  visibleColumnKeys?: { [key: string]: boolean }
  onChange?: (visibleKeys: { [key: string]: boolean }) => void
  headExtra?: ReactNode
  foot?: ReactNode
}

export default function ColumnsSelector({
  columns,
  visibleColumnKeys,
  onChange,
  foot,
}: IColumnsSelectorProps) {
  const { t } = useTranslation()

  const visibleKeys = useMemo(() => {
    if (visibleColumnKeys) {
      return visibleColumnKeys
    }
    return columns.reduce((acc, cur) => {
      acc[cur.key] = true
      return acc
    }, {})
  }, [visibleColumnKeys, columns])

  const dropdownMenus = (
    <Space direction="vertical">
      {columns
        .filter((c) => c.key !== 'dummy')
        .map((column) => (
          <Checkbox
            key={column.key}
            checked={visibleKeys[column.key]}
            onChange={(e) => {
              onChange &&
                onChange({
                  ...visibleKeys,
                  [column.key]: e.target.checked,
                })
            }}
          >
            {column.name}
          </Checkbox>
        ))}

      {foot && <div className={styles.foot_container}>{foot}</div>}
    </Space>
  )

  return (
    <Popover content={dropdownMenus} placement="bottom">
      <span style={{ cursor: 'pointer' }}>
        {t('component.columnsSelector.text')} <DownOutlined />
      </span>
    </Popover>
  )
}
