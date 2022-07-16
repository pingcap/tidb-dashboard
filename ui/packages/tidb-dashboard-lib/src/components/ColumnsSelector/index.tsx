import React, { ReactNode, useMemo, useState, useEffect } from 'react'
import { Checkbox, Popover, Space, Button } from 'antd'
import { DownOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { IColumn } from 'office-ui-fabric-react/lib/DetailsList'
import { addTranslationResource } from '@lib/utils/i18n'

import styles from './index.module.less'

const translations = {
  en: {
    trigger_text: 'Columns',
    select: 'Select',
    reset: 'Reset'
  },
  zh: {
    trigger_text: '选择列',
    select: '选择',
    reset: '重置'
  }
}

for (const key in translations) {
  addTranslationResource(key, {
    component: {
      columnsSelector: translations[key]
    }
  })
}

export interface IColumnKeys {
  [key: string]: boolean
}

export interface IColumnsSelectorProps {
  columns: IColumn[]
  visibleColumnKeys?: IColumnKeys
  defaultVisibleColumnKeys?: IColumnKeys
  onChange?: (visibleKeys: IColumnKeys) => void
  foot?: ReactNode
}

export default function ColumnsSelector({
  columns,
  visibleColumnKeys,
  defaultVisibleColumnKeys,
  onChange,
  foot
}: IColumnsSelectorProps) {
  const { t } = useTranslation()
  const [indeterminate, setIndeterminate] = useState(true)
  const [checkedAll, setCheckedAll] = useState(false)

  const filteredColumns = useMemo(
    () => columns.filter((c) => c.key !== 'dummy'),
    [columns]
  )

  const visibleKeys = useMemo(() => {
    if (visibleColumnKeys) {
      return visibleColumnKeys
    }
    return columns.reduce((acc, cur) => {
      acc[cur.key] = true
      return acc
    }, {})
  }, [visibleColumnKeys, columns])

  useEffect(() => {
    function updateCheckAllStatus(columnKeys) {
      const checkedKeysCount = Object.keys(columnKeys).filter(
        (k) => columnKeys[k] && k !== 'dummy'
      ).length
      setIndeterminate(
        checkedKeysCount > 0 && checkedKeysCount < filteredColumns.length
      )
      setCheckedAll(checkedKeysCount === filteredColumns.length)
    }

    updateCheckAllStatus(visibleKeys)
  }, [visibleKeys, filteredColumns])

  function handleCheckAllChange(e) {
    const checked = e.target.checked
    const newVisibleKeys = columns.reduce((acc, cur) => {
      acc[cur.key] = checked
      return acc
    }, {})
    onChange && onChange(newVisibleKeys)
  }

  function handleCheckChange(e, column: IColumn) {
    const checked = e.target.checked
    const newVisibleKeys = {
      ...visibleKeys,
      [column.key]: checked
    }
    onChange && onChange(newVisibleKeys)
  }

  const title = (
    <div className={styles.title_container}>
      <Checkbox
        indeterminate={indeterminate}
        checked={checkedAll}
        onChange={handleCheckAllChange}
        data-e2e="column_selector_title"
      >
        {t('component.columnsSelector.select')}
      </Checkbox>
      {defaultVisibleColumnKeys && (
        <Button
          type="link"
          onClick={() => onChange && onChange(defaultVisibleColumnKeys)}
          data-e2e="column_selector_reset"
        >
          {t('component.columnsSelector.reset')}
        </Button>
      )}
    </div>
  )

  const content = (
    <div style={{ marginTop: -12 }}>
      <Space
        direction="vertical"
        style={{
          maxHeight: 400,
          overflow: 'auto',
          paddingTop: 8,
          paddingBottom: 8
        }}
        data-e2e="columns_selector_popover_content"
      >
        {filteredColumns.map((column) => (
          <Checkbox
            data-e2e={`columns_selector_field_${column.key}`}
            key={column.key}
            checked={visibleKeys[column.key]}
            onChange={(e) => handleCheckChange(e, column)}
          >
            {column.name}
          </Checkbox>
        ))}
      </Space>
      {foot && <div className={styles.foot_container}>{foot}</div>}
    </div>
  )

  return (
    <Popover content={content} title={title} placement="bottomLeft">
      <span data-e2e="columns_selector_popover" style={{ cursor: 'pointer' }}>
        {t('component.columnsSelector.trigger_text')} <DownOutlined />
      </span>
    </Popover>
  )
}
