import React from 'react'
import { Checkbox, Popover, Space } from 'antd'
import { DownOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { IColumn } from 'office-ui-fabric-react/lib/DetailsList'
import { addTranslationResource } from '@lib/utils/i18n'

const translations = {
  en: {
    trigger_text: 'Columns'
  },
  zh: {
    trigger_text: '选择列'
  }
}

for (const key in translations) {
  addTranslationResource(key, {
    component: {
      binaryPlanColsSelector: translations[key]
    }
  })
}

export interface IColumnKeys {
  [key: string]: boolean
}

export interface IBinaryPlanColsSelectorProps {
  columns: IColumn[]
  visibleColumnKeys: IColumnKeys
  onChange?: (visibleKeys: IColumnKeys) => void
}

export function BinaryPlanColsSelector({
  columns,
  visibleColumnKeys,
  onChange
}: IBinaryPlanColsSelectorProps) {
  const { t } = useTranslation()

  function handleCheckChange(e, column: IColumn) {
    const checked = e.target.checked
    const newVisibleKeys = {
      ...visibleColumnKeys,
      [column.key]: checked
    }
    onChange && onChange(newVisibleKeys)
  }

  const content = (
    <div>
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
        {columns.map((column) => (
          <Checkbox
            data-e2e={`binary_plan_columns_selector_field_${column.key}`}
            key={column.key}
            checked={visibleColumnKeys[column.key]}
            onChange={(e) => handleCheckChange(e, column)}
          >
            {column['extra']}
          </Checkbox>
        ))}
      </Space>
    </div>
  )

  return (
    <Popover content={content} placement="bottomLeft">
      <span
        data-e2e="binary_plan_cols_selector_popover"
        style={{ cursor: 'pointer' }}
      >
        {t('component.binaryPlanColsSelector.trigger_text')} <DownOutlined />
      </span>
    </Popover>
  )
}
