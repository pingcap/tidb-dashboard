import React, { useCallback, useContext, useState } from 'react'
import { Select } from 'antd'
import { useTranslation } from 'react-i18next'

import type { ApiFormWidget } from './index'
import { useLimitSelection } from './useLimitSelection'
import { DebugAPIContext } from '../../context'

export const DatabaseWidget: ApiFormWidget = ({ value, onChange }) => {
  const ctx = useContext(DebugAPIContext)

  const { t } = useTranslation()
  const tips = t(`debug_api.widgets.db_dropdown`)

  const [loading, setLoading] = useState(false)
  const [options, setOptions] = useState<string[]>([])
  const onFocus = useCallback(async () => {
    if (options.length) {
      return
    }

    setLoading(true)
    try {
      const rst = await ctx!.ds.infoListDatabases()
      setOptions(rst.data)
    } finally {
      setLoading(false)
    }
  }, [setLoading, setOptions, options, ctx])

  const memoOnChange = useCallback(
    (tags: string[]) => onChange?.(tags[0]),
    [onChange]
  )
  const { selectRef, onSelectChange } = useLimitSelection(1, memoOnChange)

  return (
    <Select
      ref={selectRef}
      mode="tags"
      dropdownStyle={{ visibility: loading ? 'hidden' : 'visible' }}
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
  )
}
