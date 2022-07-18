import React, { useCallback, useContext, useRef, useState } from 'react'
import { Select } from 'antd'
import { useTranslation } from 'react-i18next'

import { InfoTableSchema } from '@lib/client'
import type { ApiFormWidget } from './index'
import { useLimitSelection } from './useLimitSelection'
import { DebugAPIContext } from '../../context'

export const TableWidget: ApiFormWidget = ({ form, value, onChange }) => {
  const ctx = useContext(DebugAPIContext)

  const { t } = useTranslation()
  const tips = t(`debug_api.widgets.table_dropdown`)

  const [loading, setLoading] = useState(false)
  const [options, setOptions] = useState<InfoTableSchema[]>([])
  const prevDBValue = useRef<string>('')
  const onFocus = useCallback(async () => {
    // Hardcode associated with the db field
    const dbValue = form.getFieldValue('db')
    if (prevDBValue.current === dbValue) {
      return
    } else {
      prevDBValue.current = dbValue
    }
    if (!dbValue) {
      setOptions([])
      return
    }

    setLoading(true)
    try {
      const rst = await ctx!.ds.infoListTables(dbValue)
      setOptions(rst.data)
    } finally {
      setLoading(false)
    }
  }, [setLoading, setOptions, form, ctx])

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
        <Select.Option key={option.table_name!} value={option.table_name!}>
          {option.table_name}
        </Select.Option>
      ))}
    </Select>
  )
}
