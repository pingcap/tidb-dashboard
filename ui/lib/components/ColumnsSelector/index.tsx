import React, { useState, ReactNode, useMemo } from 'react'
import { Dropdown, Menu, Checkbox } from 'antd'
import { DownOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { IColumn } from 'office-ui-fabric-react/lib/DetailsList'
import { addTranslationResource } from '@lib/utils/i18n'

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
  footExtra?: ReactNode
}

export default function ColumnsSelector({
  columns,
  visibleColumnKeys,
  onChange,
  headExtra,
  footExtra,
}: IColumnsSelectorProps) {
  const { t } = useTranslation()
  const [dropdownVisible, setDropdownVisible] = useState(false)

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
    <Menu>
      {headExtra && <Menu.Item key="head">{headExtra}</Menu.Item>}
      {headExtra && <Menu.Divider />}

      {columns
        .filter((c) => c.key !== 'dummy')
        .map((column) => (
          <Menu.Item key={column.key}>
            <Checkbox
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
          </Menu.Item>
        ))}

      {footExtra && <Menu.Divider />}
      {footExtra && <Menu.Item key="foot">{footExtra}</Menu.Item>}
      {/* Menu children only can be Divider/Item/SubMenu/MenuGroup */}
      {/* So the following code doesn't work */}
      {/*
      {footExtra && (
        <>
          <Menu.Divider />
          <Menu.Item key="foot">{footExtra}</Menu.Item>
        </>
      )}
      */}
    </Menu>
  )

  return (
    <Dropdown
      placement="bottomRight"
      visible={dropdownVisible}
      onVisibleChange={setDropdownVisible}
      overlay={dropdownMenus}
    >
      <div style={{ cursor: 'pointer' }}>
        {t('component.columnsSelector.text')} <DownOutlined />
      </div>
    </Dropdown>
  )
}
