import React, { useCallback, useRef, useState } from 'react'
import { Select, Tooltip } from 'antd'
import { useTranslation } from 'react-i18next'

import client from '@lib/client'
import type { ApiFormWidget } from './index'

export const DatabaseWidget: ApiFormWidget = ({ value, onChange }) => {
  const { t } = useTranslation()
  const tips = t(`debug_api.widgets.db`)

  const [loading, setLoading] = useState(false)
  const [options, setOptions] = useState<string[]>([])
  const onFocus = useCallback(async () => {
    if (options.length) {
      return
    }

    setLoading(true)
    try {
      const rst = await client.getInstance().infoListDatabases()
      setOptions(rst.data)
    } finally {
      setLoading(false)
    }
  }, [setLoading, setOptions, options])

  const selectRef = useRef<any>(null)
  const onSelectChange = useCallback(
    (tags: string[]) => {
      // Limit the available options to one option
      // There are no official limit props. https://github.com/ant-design/ant-design/issues/6626
      if (tags.length > 1) {
        tags.shift()
      }
      if (!!tags.length) {
        selectRef.current.blur()
      }
      onChange?.(tags[0])
    },
    [onChange, selectRef]
  )

  return (
    <Tooltip trigger={['focus']} title={tips} placement="topLeft">
      <Select
        ref={selectRef}
        mode="tags"
        loading={loading}
        placeholder={tips}
        value={value ? [value] : []}
        onFocus={onFocus}
        onChange={onSelectChange}
      >
        {options.map((option) => (
          <Select.Option key={option} value={option}>
            {option}
          </Select.Option>
        ))}
      </Select>
    </Tooltip>
  )
}
